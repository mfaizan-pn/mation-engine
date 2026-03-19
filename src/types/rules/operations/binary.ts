/**
 * What: Binary and group operation AST node types.
 * Why: Models two-argument comparisons and logical conjunction groups.
 * How to use:
 * Binary: `{ kind:"binary", operand:"NUMBER", operator:"GREATER_THAN", ... }`
 * Group: `{ kind:"group", combinator:"AND", children:[...] }`
 */
import { OperandNode } from "../components/operands";
import { UnaryOperationNode } from "./unary";

export interface BinaryOperationNode {
  kind: "binary";
  operand: string;
  operator: string;
  left: OperandNode;
  right: OperandNode;
}

export interface LogicalGroupNode {
  kind: "group";
  combinator: "AND" | "OR";
  children: RuleOperationNode[];
}

export type RuleOperationNode =
  | BinaryOperationNode
  | LogicalGroupNode
  | UnaryOperationNode;
