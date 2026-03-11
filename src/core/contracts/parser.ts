/**
 * What: Parsing contract (input -> AST).
 * Why: Standardizes how rule inputs become executable structures.
 * How to use:
 * `class MyParser implements RuleParser<Input, Ast> { parse(i){...} }`
 */
export interface RuleParser<TInput, TAst> {
  parse(input: TInput): TAst | Promise<TAst>;
}
