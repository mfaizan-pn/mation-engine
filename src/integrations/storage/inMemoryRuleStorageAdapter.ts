/**
 * What: In-memory implementation of `RuleStorageAdapter`.
 * Why: Useful for local development/tests before DB adapter is added.
 * How to use:
 * `createEngine({ storage: new InMemoryRuleStorageAdapter() })`
 */
import { RuleStorageAdapter } from "../../core/contracts";
import { ConditionDefinition } from "../../repositories";

export class InMemoryRuleStorageAdapter implements RuleStorageAdapter {
  private readonly store = new Map<string, ConditionDefinition>();

  public saveRule(rule: ConditionDefinition): void {
    this.store.set(rule.id, rule);
  }

  public loadRule(id: string): ConditionDefinition | null {
    return this.store.get(id) ?? null;
  }

  public listRules(): ReadonlyArray<ConditionDefinition> {
    return Array.from(this.store.values());
  }

  public deleteRule(id: string): boolean {
    return this.store.delete(id);
  }
}
