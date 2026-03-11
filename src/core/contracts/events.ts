/**
 * What: Event hook signatures emitted by the engine.
 * Why: Enables logging, tracing, and metrics without coupling core logic.
 * How to use:
 * `createEngine({ events: { onRuleEvaluated: (p) => console.log(p) } })`
 */
import { ConditionDefinition } from "../../repositories";

export interface RuleEngineEventMap {
  onRuleEvaluated?: (payload: {
    ruleId?: string;
    result: boolean;
    traceLength: number;
  }) => void;
  onValidationFailed?: (payload: {
    ruleId?: string;
    errors: ReadonlyArray<string>;
  }) => void;
  onRuleRegistered?: (payload: { rule: ConditionDefinition }) => void;
}
