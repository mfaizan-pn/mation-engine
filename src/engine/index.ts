/**
 * What: Barrel export for engine modules.
 * Why: Keeps external imports clean and stable.
 * How to use:
 * `import { createEngine, RuleEngineService } from "../engine";`
 */
export * from "./createEngine";
export * from "./evaluator";
export * from "./parser";
export * from "./ruleEngine";
export * from "./serializer";
export * from "./types";
export * from "./validator";
export * from "./variableResolver";
