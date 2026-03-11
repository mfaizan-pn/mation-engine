/**
 * What: API-level tests for rule management, extension hooks, and storage.
 * Why: Confirms developer-facing engine APIs behave as expected.
 * How to use:
 * `pnpm test` (runs this via Vitest).
 */
import { describe, expect, it } from "vitest";
import { createEngine, InMemoryRuleStorageAdapter } from "../../index";

describe("rule management api", () => {
  it("registers, updates, and removes rules", () => {
    const engine = createEngine<Record<string, unknown>>({
      freezeAfterInit: false,
    });

    engine.registerRule({
      id: "eligible-rule",
      definition: {
        operand: "NUMBER",
        operator: "GREATER_THAN",
        subject: "candidate.experienceYears",
        reference: 2,
      },
      metadata: { team: "ats" },
    });

    expect(engine.getRule("eligible-rule")?.id).toBe("eligible-rule");

    engine.updateRule({
      id: "eligible-rule",
      definition: {
        operand: "NUMBER",
        operator: "GREATER_THAN",
        subject: "candidate.experienceYears",
        reference: 4,
      },
    });

    const updated = engine.getRule("eligible-rule");
    expect(updated).toBeDefined();
    expect(engine.removeRule("eligible-rule")).toBe(true);
    expect(engine.getRule("eligible-rule")).toBeUndefined();
  });
});

describe("extension api", () => {
  it("registers custom operand/operator/function and evaluates", () => {
    const engine = createEngine<Record<string, unknown>>({
      includeDefaults: false,
      freezeAfterInit: false,
      operands: [{ key: "STRING", group: "EVALUATION" }],
    });

    engine.registerOperator({
      key: "ENDS_WITH",
      operand: "STRING",
      arity: 2,
    });

    engine.registerFunction({
      key: "STRING:ENDS_WITH",
      operand: "STRING",
      operator: "ENDS_WITH",
      signature: (left: unknown, right: unknown) =>
        typeof left === "string" &&
        typeof right === "string" &&
        left.endsWith(right),
    });

    const result = engine.service.execute(
      {
        operand: "STRING",
        operator: "ENDS_WITH",
        subject: "candidate.email",
        reference: "@company.com",
      },
      {
        candidate: { email: "dev@company.com" },
      },
    );

    expect(result.isValid).toBe(true);
    expect(result.result).toBe(true);
  });
});

describe("event hooks", () => {
  it("emits registration and evaluation events", () => {
    let registered = 0;
    let evaluated = 0;

    const engine = createEngine<Record<string, unknown>>({
      freezeAfterInit: false,
      events: {
        onRuleRegistered: () => {
          registered += 1;
        },
        onRuleEvaluated: () => {
          evaluated += 1;
        },
      },
    });

    engine.registerRule({
      id: "event-rule",
      definition: {
        operand: "COMMON",
        operator: "EXISTS",
        subject: "candidate.email",
      },
    });

    engine.service.execute(
      {
        operand: "COMMON",
        operator: "EXISTS",
        subject: "candidate.email",
      },
      { candidate: { email: "event@example.com" } },
    );

    expect(registered).toBe(1);
    expect(evaluated).toBe(1);
  });
});

describe("storage adapter", () => {
  it("persists registered rule into adapter", () => {
    const storage = new InMemoryRuleStorageAdapter();
    const engine = createEngine<Record<string, unknown>>({
      freezeAfterInit: false,
      storage,
    });

    engine.registerRule({
      id: "storage-rule",
      definition: {
        operand: "COMMON",
        operator: "EXISTS",
        subject: "candidate.id",
      },
    });

    expect(storage.loadRule("storage-rule")?.id).toBe("storage-rule");
    expect(storage.listRules().length).toBe(1);
  });
});
