/**
 * What: Storage contracts for compiled rule artifacts and registry extensions.
 * Why: Decouples compile/runtime pipeline from concrete persistence backends.
 * How to use:
 * `class X implements CompiledRuleStorageAdapter { ... }`
 */
import { RegistryExtensionState } from "./types";

export interface CompiledRuleStorageAdapter {
  saveRuleArtifact(ruleId: string, artifactBinary: Buffer): Promise<void>;
  loadRuleArtifact(ruleId: string): Promise<Buffer | null>;
  listRuleIds(): Promise<ReadonlyArray<string>>;
  deleteRuleArtifact?(ruleId: string): Promise<boolean>;
  saveRegistryExtensions?(state: RegistryExtensionState): Promise<void>;
  loadRegistryExtensions?(): Promise<RegistryExtensionState | null>;
}
