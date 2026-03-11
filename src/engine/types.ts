/**
 * What: Shared input/output types for engine parser and executor APIs.
 * Why: Keeps public shapes explicit and stable for consumers.
 * How to use:
 * `const input: RuleInput = { operand:"COMMON", operator:"EXISTS", subject:"user.id" }`
 */
import { RuleOperationNode } from "../types/rules/operations";

export interface RuleConditionInput {
  operand: string;
  operator: string;
  subject: string | unknown;
  reference?: unknown;
  subjectType?: "variable" | "literal";
  referenceType?: "variable" | "literal";
}

export interface RuleGroupInput {
  combinator: "AND" | "OR";
  conditions: RuleInput[];
}

export type RuleInput = RuleConditionInput | RuleGroupInput;

export interface EvaluationTraceEntry {
  node: string;
  operand?: string;
  operator?: string;
  result: boolean;
}

export interface RuleExecutionResult {
  ast: RuleOperationNode;
  isValid: boolean;
  errors: string[];
  result?: boolean;
  trace: EvaluationTraceEntry[];
}

export interface StoredRuleInput {
  id: string;
  definition: RuleInput;
  metadata?: Record<string, unknown>;
}
