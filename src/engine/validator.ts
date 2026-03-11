/**
 * What: Repository-backed AST validator.
 * Why: Prevents invalid rules from reaching runtime execution.
 * How to use:
 * `validator.validate(ast)` before `evaluator.evaluate(...)`
 */
import { RuleValidator, ValidationResult } from "../core/contracts";
import {
  FunctionRepository,
  OperandRepository,
  OperatorRepository,
  functionRepositoryKeyByParts,
  operatorRepositoryKeyByParts,
} from "../repositories";
import { RuleOperationNode } from "../types/rules/operations";

const defaultValidationResult = (): ValidationResult => ({
  isValid: true,
  errors: [],
});

export class EngineRuleValidator
  implements RuleValidator<RuleOperationNode, undefined>
{
  public constructor(
    private readonly operands: OperandRepository,
    private readonly operators: OperatorRepository,
    private readonly functions: FunctionRepository,
  ) {}

  public validate(ast: RuleOperationNode): ValidationResult {
    const result = defaultValidationResult();
    this.validateNode(ast, result.errors);
    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateNode(node: RuleOperationNode, errors: string[]): void {
    if (node.kind === "group") {
      if (node.children.length === 0) {
        errors.push("Group node must have at least one child.");
      }

      for (const child of node.children) {
        this.validateNode(child, errors);
      }

      return;
    }

    if (!this.operands.has(node.operand)) {
      errors.push(`Unknown operand: ${node.operand}`);
      return;
    }

    const operatorKey = operatorRepositoryKeyByParts(
      node.operand,
      node.operator,
    );

    const operatorDefinition = this.operators.get(operatorKey);
    if (!operatorDefinition) {
      errors.push(
        `Unknown operator for operand ${node.operand}: ${node.operator}`,
      );
      return;
    }

    const functionKey = functionRepositoryKeyByParts(
      node.operand,
      node.operator,
    );

    if (!this.functions.has(functionKey)) {
      errors.push(
        `Missing function implementation for ${node.operand}:${node.operator}`,
      );
      return;
    }

    if (operatorDefinition.arity !== undefined) {
      const actualArity = node.kind === "unary" ? 1 : 2;
      if (operatorDefinition.arity !== actualArity) {
        errors.push(
          `Invalid arity for ${node.operand}:${node.operator}. Expected ${operatorDefinition.arity}, got ${actualArity}.`,
        );
      }
    }
  }
}
