/**
 * What: Evaluation contracts (AST + runtime context -> result).
 * Why: Enforces consistent return shape for execution outputs.
 * How to use:
 * `evaluator.evaluate(ast, ctx)` -> `{ result, trace? }`
 */
export interface EvaluationResult<TResult = boolean, TTrace = unknown> {
  result: TResult;
  trace?: TTrace;
}

export interface RuleEvaluator<
  TAst,
  TContext,
  TResult = boolean,
  TTrace = unknown,
> {
  evaluate(
    ast: TAst,
    context: TContext,
  ):
    | EvaluationResult<TResult, TTrace>
    | Promise<EvaluationResult<TResult, TTrace>>;
}
