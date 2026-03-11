/**
 * What: Validation contracts for AST checks.
 * Why: Keeps rule correctness checks consistent before evaluation.
 * How to use:
 * `validator.validate(ast)` -> `{ isValid, errors }`
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface RuleValidator<TAst, TContext = unknown> {
  validate(
    ast: TAst,
    context?: TContext,
  ): ValidationResult | Promise<ValidationResult>;
}
