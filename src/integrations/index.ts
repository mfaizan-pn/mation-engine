/**
 * What: Barrel export for integration adapters/presets.
 * Why: Central entry point for optional integration modules.
 * How to use:
 * `import { InMemoryRuleStorageAdapter } from "mation-engines";`
 */
export * from "./storage/inMemoryRuleStorageAdapter";
export * from "./storage/minioRuleStorageAdapter";
export * from "./pnow";
