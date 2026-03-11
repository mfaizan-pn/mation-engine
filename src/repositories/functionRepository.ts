/**
 * What: Repository for executable operator function definitions.
 * Why: Separates function lookup from evaluator logic.
 * How to use:
 * `functions.register("NUMBER:GREATER_THAN", def)`
 */
import { MemoryRepository } from "./memoryRepository";
import { FunctionDefinition } from "./types";

export class FunctionRepository extends MemoryRepository<
  string,
  FunctionDefinition
> {}
