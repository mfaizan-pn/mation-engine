/**
 * What: Repository for operand definitions.
 * Why: Validator confirms rule operands are registered before execution.
 * How to use:
 * `operands.register("STRING", { key:"STRING", group:"EVALUATION" })`
 */
import { MemoryRepository } from "./memoryRepository";
import { OperandDefinition } from "./types";

export class OperandRepository extends MemoryRepository<
  string,
  OperandDefinition
> {}
