/**
 * What: Repository for operator metadata records.
 * Why: Validator uses it to check operator availability and arity.
 * How to use:
 * `operators.register("COMMON:EXISTS", { ... })`
 */
import { MemoryRepository } from "./memoryRepository";
import { OperatorDefinition } from "./types";

export class OperatorRepository extends MemoryRepository<
  string,
  OperatorDefinition
> {}
