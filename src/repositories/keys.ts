/**
 * What: Helpers to derive deterministic repository keys.
 * Why: Ensures all modules use the same key format (`operand:operator`).
 * How to use:
 * `functionRepositoryKeyByParts("COMMON", "EXISTS") // "COMMON:EXISTS"`
 */
import { FunctionDefinition, OperatorDefinition } from "./types";

export const operatorRepositoryKey = (operator: OperatorDefinition): string =>
  `${operator.operand}:${operator.key}`;

export const operatorRepositoryKeyByParts = (
  operand: string,
  operator: string,
): string => `${operand}:${operator}`;

export const functionRepositoryKey = (definition: FunctionDefinition): string =>
  `${definition.operand}:${definition.operator}`;

export const functionRepositoryKeyByParts = (
  operand: string,
  operator: string,
): string => `${operand}:${operator}`;
