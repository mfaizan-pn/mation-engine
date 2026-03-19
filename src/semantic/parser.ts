/**
 * What: Parser that lowers external rule input into universal DSL.
 * Why: Separates input syntax from semantic representation.
 * How to use:
 * `const dsl = parser.parse(ruleId, ruleInput);`
 */
import {
  RuleConditionInput,
  RuleGroupInput,
  RuleInput,
  UniversalDslComparisonNode,
  UniversalDslLogicalNode,
  UniversalDslNode,
  UniversalDslRule,
  UniversalValueRef,
} from "./types";

const isGroupInput = (input: RuleInput): input is RuleGroupInput =>
  "conditions" in input;

const toSubjectRef = (
  value: unknown,
  explicitType?: "variable" | "literal",
): UniversalValueRef => {
  if (explicitType === "literal") {
    return { type: "literal", value };
  }
  if (typeof value === "string") {
    return { type: "path", value };
  }
  return { type: "literal", value };
};

const toReferenceRef = (
  value: unknown,
  explicitType?: "variable" | "literal",
): UniversalValueRef => {
  if (explicitType === "variable" && typeof value === "string") {
    return { type: "path", value };
  }
  return { type: "literal", value };
};

const toComparisonNode = (
  input: RuleConditionInput,
): UniversalDslComparisonNode => ({
  nodeType: "comparison",
  operandKey: input.operand,
  operatorKey: input.operator,
  subject: toSubjectRef(input.subject, input.subjectType),
  reference:
    input.reference === undefined
      ? undefined
      : toReferenceRef(input.reference, input.referenceType),
});

const toDslNode = (input: RuleInput): UniversalDslNode => {
  if (!isGroupInput(input)) {
    return toComparisonNode(input);
  }

  const logical: UniversalDslLogicalNode = {
    nodeType: "logical",
    operatorKey: input.combinator,
    children: input.conditions.map((condition) => toDslNode(condition)),
  };
  return logical;
};

export class UniversalDslParser {
  public parse(
    ruleId: string,
    input: RuleInput,
    metadata?: Record<string, unknown>,
  ): UniversalDslRule {
    return {
      ruleId,
      root: toDslNode(input),
      metadata,
      inversionFlag: false,
    };
  }
}
