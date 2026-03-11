/**
 * What: Converts developer rule input into AST nodes.
 * Why: Evaluator/validator operate on normalized AST shape.
 * How to use:
 * `const ast = new ASTBuilder().parse(ruleInput);`
 */
import { RuleParser } from "../core/contracts";
import {
  literal,
  OperandNode,
  variable,
} from "../types/rules/components/operands";
import {
  BinaryOperationNode,
  LogicalGroupNode,
  RuleOperationNode,
  UnaryOperationNode,
} from "../types/rules/operations";
import { RuleConditionInput, RuleGroupInput, RuleInput } from "./types";

const isGroupInput = (input: RuleInput): input is RuleGroupInput =>
  "conditions" in input;

const toSubjectOperandNode = (
  value: unknown,
  explicitType?: "variable" | "literal",
): OperandNode => {
  if (explicitType === "variable" && typeof value === "string") {
    return variable(value);
  }

  if (explicitType === "literal") {
    return literal(value);
  }

  if (typeof value === "string") {
    return variable(value);
  }

  return literal(value);
};

const toReferenceOperandNode = (
  value: unknown,
  explicitType?: "variable" | "literal",
): OperandNode => {
  if (explicitType === "variable" && typeof value === "string") {
    return variable(value);
  }

  if (explicitType === "literal") {
    return literal(value);
  }

  return literal(value);
};

const toConditionNode = (
  input: RuleConditionInput,
): UnaryOperationNode | BinaryOperationNode => {
  const subject = toSubjectOperandNode(input.subject, input.subjectType);

  if (input.reference === undefined) {
    return {
      kind: "unary",
      operand: input.operand,
      operator: input.operator,
      argument: subject,
    };
  }

  return {
    kind: "binary",
    operand: input.operand,
    operator: input.operator,
    left: subject,
    right: toReferenceOperandNode(input.reference, input.referenceType),
  };
};

export class ASTBuilder implements RuleParser<RuleInput, RuleOperationNode> {
  public parse(input: RuleInput): RuleOperationNode {
    if (!isGroupInput(input)) {
      return toConditionNode(input);
    }

    const group: LogicalGroupNode = {
      kind: "group",
      combinator: input.combinator,
      children: input.conditions.map((child) => this.parse(child)),
    };

    return group;
  }
}
