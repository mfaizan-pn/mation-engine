/**
 * What: Factory that wires repositories + service into a ready engine.
 * Why: Standard startup path for apps using this library.
 * How to use:
 * `const engine = createEngine<{ candidate: unknown }>();`
 */
import {
  DEFAULT_FUNCTIONS,
  DEFAULT_OPERANDS,
  DEFAULT_OPERATORS,
  initializeRepositories,
  RepositoryBootstrapConfig,
  RuleEngineRepositories,
} from "../bootstrap";
import { RuleEngineEventMap, RuleStorageAdapter } from "../core/contracts";
import { RuleEngineService } from "./ruleEngine";
import { StoredRuleInput } from "./types";

export interface EngineConfig extends RepositoryBootstrapConfig {
  includeDefaults?: boolean;
  events?: RuleEngineEventMap;
  storage?: RuleStorageAdapter;
}

export interface RuleEngine<TContext extends Record<string, unknown>> {
  repositories: RuleEngineRepositories;
  service: RuleEngineService<TContext>;
  registerRule(
    input: StoredRuleInput,
  ): ReturnType<RuleEngineService<TContext>["registerRule"]>;
  updateRule(
    input: StoredRuleInput,
  ): ReturnType<RuleEngineService<TContext>["updateRule"]>;
  removeRule(id: string): ReturnType<RuleEngineService<TContext>["removeRule"]>;
  getRule(id: string): ReturnType<RuleEngineService<TContext>["getRule"]>;
  registerOperand: RuleEngineService<TContext>["registerOperand"];
  registerOperator: RuleEngineService<TContext>["registerOperator"];
  registerFunction: RuleEngineService<TContext>["registerFunction"];
}

export const createEngine = <TContext extends Record<string, unknown>>(
  config: EngineConfig = {},
): RuleEngine<TContext> => {
  const includeDefaults = config.includeDefaults ?? true;

  const repositories = initializeRepositories({
    operands: includeDefaults
      ? [...DEFAULT_OPERANDS, ...(config.operands ?? [])]
      : config.operands,
    operators: includeDefaults
      ? [...DEFAULT_OPERATORS, ...(config.operators ?? [])]
      : config.operators,
    functions: includeDefaults
      ? [...DEFAULT_FUNCTIONS, ...(config.functions ?? [])]
      : config.functions,
    conditions: config.conditions,
    freezeAfterInit: config.freezeAfterInit ?? true,
  });

  const service = new RuleEngineService<TContext>(
    repositories,
    config.events,
    config.storage,
  );

  return {
    repositories,
    service,
    registerRule: (input) => service.registerRule(input),
    updateRule: (input) => service.updateRule(input),
    removeRule: (id) => service.removeRule(id),
    getRule: (id) => service.getRule(id),
    registerOperand: (definition) => service.registerOperand(definition),
    registerOperator: (definition) => service.registerOperator(definition),
    registerFunction: (definition) => service.registerFunction(definition),
  };
};
