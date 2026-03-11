/**
 * What: Storage adapter contract for persisted rule definitions.
 * Why: Lets consumers plug DB-specific persistence without changing core.
 * How to use:
 * `createEngine({ storage: myAdapter })`
 */
import { ConditionDefinition } from "../../repositories";

export interface RuleStorageAdapter {
  saveRule(rule: ConditionDefinition): Promise<void> | void;
  loadRule(
    id: string,
  ): Promise<ConditionDefinition | null> | ConditionDefinition | null;
  listRules():
    | Promise<ReadonlyArray<ConditionDefinition>>
    | ReadonlyArray<ConditionDefinition>;
  deleteRule?(id: string): Promise<boolean> | boolean;
}
