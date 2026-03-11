/**
 * What: Generic mapped type for literal-key catalogs.
 * Why: Ensures keys and values remain identical string literals.
 * How to use:
 * `type Ops = OperandMap<"EQUALS" | "CONTAINS">;`
 */
export type OperandMap<T extends string> = {
  [K in T]: K;
};
