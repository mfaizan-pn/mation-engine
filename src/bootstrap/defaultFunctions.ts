/**
 * What: Default function implementations for core operators.
 * Why: Evaluator resolves and executes these from the function repository.
 * How to use:
 * Loaded automatically by `createEngine()` unless defaults are disabled.
 */
import { FunctionDefinition } from "../repositories";

export const DEFAULT_FUNCTIONS: ReadonlyArray<FunctionDefinition> = [
  {
    key: "STRING:CONTAINS",
    operand: "STRING",
    operator: "CONTAINS",
    signature: (input: unknown, reference: unknown): boolean =>
      typeof input === "string" &&
      typeof reference === "string" &&
      input.includes(reference),
  },
  {
    key: "NUMBER:GREATER_THAN",
    operand: "NUMBER",
    operator: "GREATER_THAN",
    signature: (input: unknown, reference: unknown): boolean =>
      typeof input === "number" &&
      typeof reference === "number" &&
      input > reference,
  },
  {
    key: "COMMON:AND",
    operand: "COMMON",
    operator: "AND",
    signature: (...values: ReadonlyArray<unknown>): boolean =>
      values.every((value) => value === true),
  },
  {
    key: "COMMON:OR",
    operand: "COMMON",
    operator: "OR",
    signature: (...values: ReadonlyArray<unknown>): boolean =>
      values.some((value) => value === true),
  },
  {
    key: "COMMON:EXISTS",
    operand: "COMMON",
    operator: "EXISTS",
    signature: (value: unknown): boolean =>
      value !== undefined && value !== null,
  },
];
