/**
 * What: Canonical definitions stored in engine repositories.
 * Why: Keeps operand/operator/function/rule records consistently shaped.
 * How to use:
 * `const op: OperatorDefinition = { key:"EXISTS", operand:"COMMON", arity:1 };`
 */
export type RuleFunctionSignature = (
  ...args: ReadonlyArray<unknown>
) => unknown;

export interface FunctionDefinition {
  key: string;
  operand: string;
  operator: string;
  signature: RuleFunctionSignature;
}

export interface OperandDefinition {
  key: string;
  group: string;
  description?: string;
}

export interface OperatorDefinition {
  key: string;
  operand: string;
  arity?: number;
  description?: string;
}

export interface ConditionDefinition {
  id: string;
  ast: unknown;
  metadata?: Record<string, unknown>;
}
