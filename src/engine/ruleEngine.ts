/**
 * What: High-level service orchestrating parse -> validate -> evaluate.
 * Why: Provides a single developer-facing API with rule management/extensibility.
 * How to use:
 * `const result = engine.service.execute(ruleInput, runtimeContext);`
 */
import {
  RuleEngineEventMap,
  RuleStorageAdapter,
  ValidationResult,
} from "../core/contracts";
import { RuleEngineRepositories } from "../bootstrap";
import {
  ConditionDefinition,
  FunctionDefinition,
  OperandDefinition,
  OperatorDefinition,
  functionRepositoryKeyByParts,
  operatorRepositoryKeyByParts,
} from "../repositories";
import { RuleOperationNode } from "../types/rules/operations";
import { ASTBuilder } from "./parser";
import { EngineRuleEvaluator } from "./evaluator";
import { JsonRuleSerializer } from "./serializer";
import { RuleExecutionResult, RuleInput, StoredRuleInput } from "./types";
import { EngineRuleValidator } from "./validator";
import { DotPathVariableResolver } from "./variableResolver";

export class RuleEngineService<TContext extends Record<string, unknown>> {
  private readonly parser = new ASTBuilder();
  private readonly serializer = new JsonRuleSerializer();
  private readonly validator: EngineRuleValidator;
  private readonly evaluator: EngineRuleEvaluator<TContext>;

  public constructor(
    private readonly repositories: RuleEngineRepositories,
    private readonly events: RuleEngineEventMap = {},
    private readonly storage?: RuleStorageAdapter,
  ) {
    this.validator = new EngineRuleValidator(
      repositories.operands,
      repositories.operators,
      repositories.functions,
    );
    this.evaluator = new EngineRuleEvaluator(
      repositories.functions,
      new DotPathVariableResolver<TContext>(),
    );
  }

  public parse(input: RuleInput): RuleOperationNode {
    return this.parser.parse(input);
  }

  public validate(ast: RuleOperationNode): ValidationResult {
    return this.validator.validate(ast);
  }

  public evaluate(ast: RuleOperationNode, context: TContext) {
    return this.evaluator.evaluate(ast, context);
  }

  public serialize(ast: RuleOperationNode): string {
    return this.serializer.serialize(ast);
  }

  public deserialize(payload: string): RuleOperationNode {
    return this.serializer.deserialize(payload);
  }

  public execute(input: RuleInput, context: TContext): RuleExecutionResult {
    const ast = this.parse(input);
    const validation = this.validate(ast);

    if (!validation.isValid) {
      this.events.onValidationFailed?.({
        errors: validation.errors,
      });
      return {
        ast,
        isValid: false,
        errors: validation.errors,
        trace: [],
      };
    }

    const evaluation = this.evaluate(ast, context);
    this.events.onRuleEvaluated?.({
      result: evaluation.result,
      traceLength: evaluation.trace?.length ?? 0,
    });
    return {
      ast,
      isValid: true,
      errors: [],
      result: evaluation.result,
      trace: [...(evaluation.trace ?? [])],
    };
  }

  public registerRule(input: StoredRuleInput): ConditionDefinition {
    if (this.repositories.conditions.has(input.id)) {
      throw new Error(`Rule already exists: ${input.id}`);
    }

    const ast = this.parse(input.definition);
    const validation = this.validate(ast);
    if (!validation.isValid) {
      this.events.onValidationFailed?.({
        ruleId: input.id,
        errors: validation.errors,
      });
      throw new Error(
        `Rule validation failed for ${input.id}: ${validation.errors.join(", ")}`,
      );
    }

    const rule: ConditionDefinition = {
      id: input.id,
      ast,
      metadata: input.metadata,
    };

    this.repositories.conditions.register(rule.id, rule);
    this.storage?.saveRule(rule);
    this.events.onRuleRegistered?.({ rule });
    return rule;
  }

  public updateRule(input: StoredRuleInput): ConditionDefinition {
    if (!this.repositories.conditions.has(input.id)) {
      throw new Error(`Rule does not exist: ${input.id}`);
    }

    const ast = this.parse(input.definition);
    const validation = this.validate(ast);
    if (!validation.isValid) {
      this.events.onValidationFailed?.({
        ruleId: input.id,
        errors: validation.errors,
      });
      throw new Error(
        `Rule validation failed for ${input.id}: ${validation.errors.join(", ")}`,
      );
    }

    const updatedRule: ConditionDefinition = {
      id: input.id,
      ast,
      metadata: input.metadata,
    };

    this.repositories.conditions.register(input.id, updatedRule);
    this.storage?.saveRule(updatedRule);
    return updatedRule;
  }

  public removeRule(id: string): boolean {
    const removed = this.repositories.conditions.delete(id);
    if (removed) {
      this.storage?.deleteRule?.(id);
    }
    return removed;
  }

  public getRule(id: string): ConditionDefinition | undefined {
    return this.repositories.conditions.get(id);
  }

  public listRules(): ReadonlyArray<ConditionDefinition> {
    return this.repositories.conditions.list().map((entry) => entry.value);
  }

  public registerOperand(definition: OperandDefinition): void {
    this.repositories.operands.register(definition.key, definition);
  }

  public registerOperator(definition: OperatorDefinition): void {
    const key = operatorRepositoryKeyByParts(
      definition.operand,
      definition.key,
    );
    this.repositories.operators.register(key, definition);
  }

  public registerFunction(definition: FunctionDefinition): void {
    const key = functionRepositoryKeyByParts(
      definition.operand,
      definition.operator,
    );
    this.repositories.functions.register(key, definition);
  }
}
