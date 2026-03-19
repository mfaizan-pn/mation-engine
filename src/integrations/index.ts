/**
 * What: Barrel export for integration adapters/presets.
 * Why: Central entry point for optional integration modules.
 * How to use:
 * `import { MinioCompiledRuleStorageAdapter } from "mation-engines";`
 */
export * from "./storage/inMemoryCompiledRuleStorageAdapter";
export * from "./storage/minioCompiledRuleStorageAdapter";
