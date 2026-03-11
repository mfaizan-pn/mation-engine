/**
 * What: Dot-path runtime variable resolver implementation.
 * Why: Evaluator needs dynamic lookup for subjects like `candidate.email`.
 * How to use:
 * `new DotPathVariableResolver().resolve("a.b", { a:{ b:1 } }) // 1`
 */
import { VariableResolver } from "../core/contracts";

export class DotPathVariableResolver<TContext extends Record<string, unknown>>
  implements VariableResolver<TContext>
{
  public resolve(path: string, context: TContext): unknown {
    if (!path) {
      return undefined;
    }

    const parts = path.split(".");
    let current: unknown = context;

    for (const part of parts) {
      if (typeof current !== "object" || current === null) {
        return undefined;
      }

      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}
