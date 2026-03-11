/**
 * What: Repository for stored rule definitions (id -> AST + metadata).
 * Why: Supports register/get/update/delete rule management APIs.
 * How to use:
 * `conditions.register("rule-1", { id:"rule-1", ast })`
 */
import { MemoryRepository } from "./memoryRepository";
import { ConditionDefinition } from "./types";

export class ConditionRepository extends MemoryRepository<
  string,
  ConditionDefinition
> {}
