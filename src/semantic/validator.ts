/**
 * What: Registry-backed validator for universal DSL rules.
 * Why: Ensures only legal, typed, and executable semantics are compiled.
 * How to use:
 * `const v = validator.validate(dslRule);`
 */
import { SemanticRegistry } from "./registry";
import { UniversalDslNode, UniversalDslRule } from "./types";

export interface SemanticValidationResult {
  isValid: boolean;
  errors: string[];
}

export class UniversalDslValidator {
  public constructor(private readonly registry: SemanticRegistry) {}

  public validate(rule: UniversalDslRule): SemanticValidationResult {
    const errors: string[] = [];
    this.validateNode(rule.root, errors);
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateNode(node: UniversalDslNode, errors: string[]): void {
    if (node.nodeType === "logical") {
      if (node.children.length === 0) {
        errors.push("Logical node must contain at least one child.");
      }
      for (const child of node.children) {
        this.validateNode(child, errors);
      }
      return;
    }

    const operand = this.registry.getOperand(node.operandKey);
    if (!operand) {
      errors.push(`Unknown operand: ${node.operandKey}`);
      return;
    }

    const operator = this.registry.getOperator(
      node.operandKey,
      node.operatorKey,
    );
    if (!operator) {
      errors.push(
        `Unknown operator ${node.operatorKey} for operand ${node.operandKey}`,
      );
      return;
    }

    const fn = this.registry.getFunctionByOperatorId(operator.id);
    if (!fn) {
      errors.push(
        `No registered runtime function for ${node.operandKey}:${node.operatorKey}`,
      );
    }

    if (operator.arity === "UNARY" && node.reference !== undefined) {
      errors.push(
        `Unary operator ${node.operatorKey} cannot have reference value.`,
      );
    }
    if (operator.arity === "BINARY" && node.reference === undefined) {
      errors.push(
        `Binary operator ${node.operatorKey} requires reference value argument.`,
      );
    }
  }
}
