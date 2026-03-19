/**
 * What: In-memory compiled-rule storage adapter for semantic pipeline.
 * Why: Local development/testing without external object storage.
 * How to use:
 * `new InMemoryCompiledRuleStorageAdapter()`
 */
import { CompiledRuleStorageAdapter } from "../../semantic";
import { RegistryExtensionState } from "../../semantic/types";

export class InMemoryCompiledRuleStorageAdapter
  implements CompiledRuleStorageAdapter
{
  private readonly artifacts = new Map<string, Buffer>();
  private registryState: RegistryExtensionState | null = null;

  public async saveRuleArtifact(ruleId: string, artifactBinary: Buffer): Promise<void> {
    this.artifacts.set(ruleId, artifactBinary);
  }

  public async loadRuleArtifact(ruleId: string): Promise<Buffer | null> {
    return this.artifacts.get(ruleId) ?? null;
  }

  public async listRuleIds(): Promise<ReadonlyArray<string>> {
    return [...this.artifacts.keys()];
  }

  public async deleteRuleArtifact(ruleId: string): Promise<boolean> {
    return this.artifacts.delete(ruleId);
  }

  public async saveRegistryExtensions(state: RegistryExtensionState): Promise<void> {
    this.registryState = state;
  }

  public async loadRegistryExtensions(): Promise<RegistryExtensionState | null> {
    return this.registryState;
  }
}
