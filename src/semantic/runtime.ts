/**
 * What: Runtime pipeline (load by ID -> verify -> decompress -> deserialize -> execute).
 * Why: Enables rule-ID-first execution with portable compiled artifacts.
 * How to use:
 * `await runtime.executeById("rule-id", context);`
 */
import { CompiledRuleStorageAdapter } from "./storage";
import { SemanticRegistry } from "./registry";
import {
  decodeCompiledIr,
  packCompiledArtifact,
  unpackCompiledArtifact,
  CompressionCodec,
} from "./codec";
import {
  CanonicalNode,
  CanonicalValueRef,
  CompiledRuleArtifact,
  RegistryExtensionState,
  RuntimeExecutionResult,
} from "./types";

const resolveValue = (
  ref: CanonicalValueRef,
  context: Record<string, unknown>,
  symbolTable: string[],
  literalPool: unknown[],
): unknown => {
  if (ref.kind === "literal") {
    return literalPool[ref.index];
  }
  const path = symbolTable[ref.index];
  const parts = path.split(".");
  let current: unknown = context;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

export class SemanticRuntime {
  private readonly artifactCache = new Map<string, CompiledRuleArtifact>();
  private readonly decodedIrCache = new Map<
    string,
    ReturnType<typeof decodeCompiledIr>
  >();

  public constructor(
    private readonly registry: SemanticRegistry,
    private readonly storage: CompiledRuleStorageAdapter,
    private readonly codec: CompressionCodec,
  ) {}

  public async hydrateRegistryExtensions(): Promise<void> {
    const extensions = await this.storage.loadRegistryExtensions?.();
    if (extensions) {
      this.registry.hydrateExtensions(extensions);
    }
  }

  public async persistRegistryExtensions(
    state: RegistryExtensionState,
  ): Promise<void> {
    await this.storage.saveRegistryExtensions?.(state);
  }

  public async saveCompiledRuleArtifact(
    ruleId: string,
    artifact: CompiledRuleArtifact,
  ): Promise<void> {
    const packed = packCompiledArtifact(artifact);
    await this.storage.saveRuleArtifact(ruleId, packed);
    this.cacheArtifact(ruleId, artifact);
  }

  public async listRuleIds(): Promise<ReadonlyArray<string>> {
    return await this.storage.listRuleIds();
  }

  public async getMetadata(ruleId: string) {
    const artifact = await this.loadArtifact(ruleId);
    return artifact?.metadata;
  }

  public async executeById(
    ruleId: string,
    context: Record<string, unknown>,
  ): Promise<RuntimeExecutionResult | null> {
    const artifact = await this.loadArtifact(ruleId);
    const ir = await this.loadDecodedIr(ruleId);
    if (!artifact || !ir) {
      return null;
    }

    if (artifact.metadata.registry_version !== this.registry.version) {
      throw new Error(
        `Registry version mismatch for ${ruleId}. Expected ${this.registry.version}, got ${artifact.metadata.registry_version}.`,
      );
    }
    const trace: RuntimeExecutionResult["trace"] = [];

    const evaluateNode = (nodeIndex: number): boolean => {
      const node = ir.nodes[nodeIndex] as CanonicalNode;

      if (node.kind === "logical") {
        const logicalOperator = this.registry.getOperatorById(node.operatorId);
        if (!logicalOperator) {
          throw new Error(`Missing logical operator ID ${node.operatorId}`);
        }

        const outcome =
          logicalOperator.key === "AND"
            ? node.childNodeIndexes.every((child) => evaluateNode(child))
            : node.childNodeIndexes.some((child) => evaluateNode(child));

        trace.push({
          nodeIndex,
          operatorId: node.operatorId,
          outcome,
        });
        return outcome;
      }

      const fn = this.registry.getFunctionByOperatorId(node.operatorId);
      if (!fn) {
        throw new Error(
          `Missing function implementation for ${node.operatorId}`,
        );
      }

      const subject = resolveValue(
        node.subjectRef,
        context,
        ir.symbolTable,
        ir.literalPool,
      );
      const reference =
        node.referenceRef === undefined
          ? undefined
          : resolveValue(
              node.referenceRef,
              context,
              ir.symbolTable,
              ir.literalPool,
            );

      const outcome =
        reference === undefined
          ? fn.implementation(subject)
          : fn.implementation(subject, reference);

      trace.push({
        nodeIndex,
        operatorId: node.operatorId,
        outcome,
      });
      return outcome;
    };

    const result = evaluateNode(ir.rootNodeIndex);
    return {
      result,
      trace,
      metadata: artifact.metadata,
    };
  }

  public async deleteRule(ruleId: string): Promise<boolean> {
    this.artifactCache.delete(ruleId);
    this.decodedIrCache.delete(ruleId);
    if (!this.storage.deleteRuleArtifact) {
      return false;
    }
    return await this.storage.deleteRuleArtifact(ruleId);
  }

  public async preloadAllArtifacts(): Promise<{
    ruleCount: number;
    loadedCount: number;
  }> {
    const ruleIds = await this.storage.listRuleIds();
    let loadedCount = 0;

    for (const ruleId of ruleIds) {
      const packed = await this.storage.loadRuleArtifact(ruleId);
      if (!packed) {
        continue;
      }
      const artifact = unpackCompiledArtifact(packed);
      this.cacheArtifact(ruleId, artifact);
      loadedCount += 1;
    }

    return { ruleCount: ruleIds.length, loadedCount };
  }

  private async loadArtifact(
    ruleId: string,
  ): Promise<CompiledRuleArtifact | null> {
    const cached = this.artifactCache.get(ruleId);
    if (cached) {
      return cached;
    }

    const packed = await this.storage.loadRuleArtifact(ruleId);
    if (!packed) {
      return null;
    }

    const artifact = unpackCompiledArtifact(packed);
    this.cacheArtifact(ruleId, artifact);
    return artifact;
  }

  private async loadDecodedIr(
    ruleId: string,
  ): Promise<ReturnType<typeof decodeCompiledIr> | null> {
    const cached = this.decodedIrCache.get(ruleId);
    if (cached) {
      return cached;
    }
    const artifact = await this.loadArtifact(ruleId);
    if (!artifact) {
      return null;
    }
    const decoded = decodeCompiledIr(artifact, this.codec);
    this.decodedIrCache.set(ruleId, decoded);
    return decoded;
  }

  private cacheArtifact(ruleId: string, artifact: CompiledRuleArtifact): void {
    this.artifactCache.set(ruleId, artifact);
    const decoded = decodeCompiledIr(artifact, this.codec);
    this.decodedIrCache.set(ruleId, decoded);
  }
}
