/**
 * What: Preset factory for `pnow-ats-v2` usage.
 * Why: Gives a consistent startup pattern with ATS-friendly defaults.
 * How to use:
 * `const engine = createPnowAtsEngine(events, storage);`
 */
import { RuleEngineEventMap, RuleStorageAdapter } from "../../core/contracts";
import { createEngine, EngineConfig, RuleEngine } from "../../engine";

export const createPnowAtsEngine = <TContext extends Record<string, unknown>>(
  events: RuleEngineEventMap = {},
  storage?: RuleStorageAdapter,
  config: Omit<EngineConfig, "events" | "storage"> = {},
): RuleEngine<TContext> =>
  createEngine<TContext>({
    ...config,
    includeDefaults: config.includeDefaults ?? true,
    freezeAfterInit: config.freezeAfterInit ?? true,
    events,
    storage,
  });
