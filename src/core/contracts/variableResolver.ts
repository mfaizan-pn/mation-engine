/**
 * What: Runtime variable resolution contract.
 * Why: Decouples path/value lookup from evaluator logic.
 * How to use:
 * `resolver.resolve("candidate.email", context)`
 */
export interface VariableResolver<TContext = unknown> {
  resolve(path: string, context: TContext): unknown;
}
