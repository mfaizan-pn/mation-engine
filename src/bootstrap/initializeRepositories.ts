/**
 * What: Startup bootstrap to hydrate repositories from provided catalogs.
 * Why: Centralizes loading and optional freezing of all engine registries.
 * How to use:
 * `const repos = initializeRepositories({ operands, operators, freezeAfterInit:true })`
 */
import {
  ConditionDefinition,
  ConditionRepository,
  FunctionDefinition,
  FunctionRepository,
  OperandDefinition,
  OperandRepository,
  OperatorDefinition,
  OperatorRepository,
  functionRepositoryKey,
  operatorRepositoryKey,
} from "../repositories";

export interface RepositoryBootstrapConfig {
  operands?: ReadonlyArray<OperandDefinition>;
  operators?: ReadonlyArray<OperatorDefinition>;
  functions?: ReadonlyArray<FunctionDefinition>;
  conditions?: ReadonlyArray<ConditionDefinition>;
  freezeAfterInit?: boolean;
}

export interface RuleEngineRepositories {
  operands: OperandRepository;
  operators: OperatorRepository;
  functions: FunctionRepository;
  conditions: ConditionRepository;
}

export const initializeRepositories = (
  config: RepositoryBootstrapConfig = {},
): RuleEngineRepositories => {
  const repositories: RuleEngineRepositories = {
    operands: new OperandRepository(),
    operators: new OperatorRepository(),
    functions: new FunctionRepository(),
    conditions: new ConditionRepository(),
  };

  if (config.operands?.length) {
    repositories.operands.registerMany(
      config.operands.map((definition) => ({
        key: definition.key,
        value: definition,
      })),
    );
  }

  if (config.operators?.length) {
    repositories.operators.registerMany(
      config.operators.map((definition) => ({
        key: operatorRepositoryKey(definition),
        value: definition,
      })),
    );
  }

  if (config.functions?.length) {
    repositories.functions.registerMany(
      config.functions.map((definition) => ({
        key: functionRepositoryKey(definition),
        value: definition,
      })),
    );
  }

  if (config.conditions?.length) {
    repositories.conditions.registerMany(
      config.conditions.map((definition) => ({
        key: definition.id,
        value: definition,
      })),
    );
  }

  if (config.freezeAfterInit) {
    repositories.operands.freeze();
    repositories.operators.freeze();
    repositories.functions.freeze();
    repositories.conditions.freeze();
  }

  return repositories;
};
