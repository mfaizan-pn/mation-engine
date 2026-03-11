/**
 * What: Unary operation AST node type.
 * Why: Represents operators that take one argument (e.g., EXISTS).
 * How to use:
 * `{ kind:"unary", operand:"COMMON", operator:"EXISTS", argument: variable("x") }`
 */
import { OperandNode } from "../components/operands";

export interface UnaryOperationNode {
  kind: "unary";
  operand: string;
  operator: string;
  argument: OperandNode;
}
