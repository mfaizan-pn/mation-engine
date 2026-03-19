/**
 * What: Creates a typed key-value map from string literals.
 * Why: Keeps operand/operator catalogs strongly typed at compile time.
 * How to use:
 * `const map = createOperands(["EQUALS", "CONTAINS"] as const);`
 * `map.EQUALS // "EQUALS"`
 */
import { OperandMap } from "../interfaces/operandMap";

const createOperands = <T extends readonly string[]>(
  values: T,
): OperandMap<T[number]> => {
  return values.reduce(
    (acc, key) => {
      acc[key as keyof OperandMap<T[number]>] = key;
      return acc;
    },
    {} as OperandMap<T[number]>,
  );
};

export { createOperands };
