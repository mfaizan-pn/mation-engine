/**
 * What: Reusable utility to capture all compile-time pipeline stages.
 * Why: Enables consistent debug/inspection output across CLI and scripts.
 * How to use:
 * `const snapshot = await buildPipelineSnapshot({ registry, codec, ruleId, input });`
 */
import {
  CanonicalAstIr,
  CompiledRuleArtifact,
  RuleInput,
  UniversalDslRule,
} from "./types";
import { SemanticRegistry } from "./registry";
import {
  buildCompiledArtifact,
  CompressionCodec,
  decodeCompiledIr,
  packCompiledArtifact,
} from "./codec";
import { UniversalDslParser } from "./parser";
import { normalizeDsl } from "./normalizer";
import { UniversalDslValidator } from "./validator";
import { lowerDslToCanonicalIr } from "./ir";

export interface PipelineSnapshot {
  source: {
    ruleId: string;
    input: RuleInput;
    metadata?: Record<string, unknown>;
  };
  parsedDsl: UniversalDslRule;
  normalizedDsl: UniversalDslRule;
  validation: {
    isValid: boolean;
    errors: string[];
  };
  canonicalIr?: CanonicalAstIr;
  artifact?: CompiledRuleArtifact;
  packedBinaryStats?: {
    totalBytes: number;
    first24BytesHex: string;
    compressedPayloadBytes: number;
  };
  decodedIr?: CanonicalAstIr;
}

const gatherReferencedFields = (
  root: UniversalDslRule["root"],
  fields: Set<string>,
): void => {
  if (root.nodeType === "logical") {
    root.children.forEach((child) => gatherReferencedFields(child, fields));
    return;
  }

  if (root.subject.type === "path") {
    fields.add(root.subject.value);
  }
  if (root.reference?.type === "path") {
    fields.add(root.reference.value);
  }
};

const gatherUsedCatalogs = (
  root: UniversalDslRule["root"],
  operands: Set<string>,
  operators: Set<string>,
): void => {
  if (root.nodeType === "logical") {
    operators.add(root.operatorKey);
    root.children.forEach((child) =>
      gatherUsedCatalogs(child, operands, operators),
    );
    return;
  }

  operands.add(root.operandKey);
  operators.add(`${root.operandKey}:${root.operatorKey}`);
};

export const buildPipelineSnapshot = async (args: {
  registry: SemanticRegistry;
  codec: CompressionCodec;
  ruleId: string;
  input: RuleInput;
  metadata?: Record<string, unknown>;
}): Promise<PipelineSnapshot> => {
  const parser = new UniversalDslParser();
  const validator = new UniversalDslValidator(args.registry);

  const parsedDsl = parser.parse(args.ruleId, args.input, args.metadata);
  const normalizedDsl = normalizeDsl(parsedDsl);
  const validation = validator.validate(normalizedDsl);

  const snapshot: PipelineSnapshot = {
    source: {
      ruleId: args.ruleId,
      input: args.input,
      metadata: args.metadata,
    },
    parsedDsl,
    normalizedDsl,
    validation,
  };

  if (!validation.isValid) {
    return snapshot;
  }

  const canonicalIr = lowerDslToCanonicalIr(normalizedDsl, args.registry);
  const now = new Date().toISOString();
  const referencedFields = new Set<string>();
  gatherReferencedFields(normalizedDsl.root, referencedFields);
  const usedOperands = new Set<string>();
  const usedOperators = new Set<string>();
  gatherUsedCatalogs(normalizedDsl.root, usedOperands, usedOperators);

  const artifact = buildCompiledArtifact(
    {
      rule_id: args.ruleId,
      rule_name:
        typeof args.metadata?.rule_name === "string"
          ? args.metadata.rule_name
          : args.ruleId,
      registry_version: args.registry.version,
      dsl_version: 1,
      ast_version: canonicalIr.astVersion,
      storage_version: 1,
      source_language: "JSON",
      source_format: "RuleInput",
      created_at: now,
      updated_at: now,
      root_node_index: canonicalIr.rootNodeIndex,
      referenced_fields: [...referencedFields],
      used_operands: [...usedOperands],
      used_operators: [...usedOperators],
      expected_input_types: [],
      null_semantics: "strict",
      coercion_policy: "none",
      verbosity: "INFO",
      inversion_flag: false,
      metrics_enabled: true,
      system_defined: false,
      semantic_metadata: args.metadata,
    },
    canonicalIr,
    args.codec,
  );

  const packed = packCompiledArtifact(artifact);
  const decodedIr = decodeCompiledIr(artifact, args.codec);

  snapshot.canonicalIr = canonicalIr;
  snapshot.artifact = artifact;
  snapshot.packedBinaryStats = {
    totalBytes: packed.length,
    first24BytesHex: packed.subarray(0, 24).toString("hex"),
    compressedPayloadBytes: artifact.compressedPayload.length,
  };
  snapshot.decodedIr = decodedIr;

  return snapshot;
};
