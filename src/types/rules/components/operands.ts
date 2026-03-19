/**
 * What: Operand node primitives used inside rule AST.
 * Why: Distinguishes runtime variables from literal values.
 * How to use:
 * `variable("candidate.email")` and `literal("@company.com")`
 */
export interface VariableOperandNode {
  kind: "variable";
  path: string;
}

export interface LiteralOperandNode {
  kind: "literal";
  value: unknown;
}

export type OperandNode = VariableOperandNode | LiteralOperandNode;

export const variable = (path: string): VariableOperandNode => ({
  kind: "variable",
  path,
});

export const literal = (value: unknown): LiteralOperandNode => ({
  kind: "literal",
  value,
});

export const isVariableOperand = (
  operand: OperandNode,
): operand is VariableOperandNode => operand.kind === "variable";
