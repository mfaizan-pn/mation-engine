/**
 * What: Tests for AGENTS-aligned semantic compile/runtime pipeline.
 * Why: Ensures rule-id execution and registry extension persistence work.
 * How to use:
 * `pnpm test`
 */
import { describe, expect, it } from "vitest";
import { InMemoryCompiledRuleStorageAdapter } from "../../integrations";
import { createSemanticEngine } from "../../semantic";

describe("semantic engine", () => {
  it("compiles, stores, and executes a rule by id", async () => {
    const storage = new InMemoryCompiledRuleStorageAdapter();
    const engine = await createSemanticEngine({ storage });

    await engine.compileAndStore("candidate-email-check", {
      operand: "STRING",
      operator: "CONTAINS",
      subject: "candidate.email",
      reference: "aol.com",
    });

    const output = await engine.executeById("candidate-email-check", {
      candidate: { email: "dev@aol.com" },
    });

    expect(output).not.toBeNull();
    expect(output?.result).toBe(true);
    expect(output?.metadata.rule_id).toBe("candidate-email-check");
  });

  it("hydrates registry extensions and compiled artifacts across engine restart", async () => {
    const storage = new InMemoryCompiledRuleStorageAdapter();
    const engine1 = await createSemanticEngine({ storage });

    await engine1.registerOperand({
      key: "TEXT",
      group: "EVALUATION",
      description: "Custom text operand",
    });
    await engine1.registerOperator({
      key: "ENDS_WITH",
      operand: "TEXT",
      arity: 2,
      description: "Custom suffix check",
    });
    await engine1.registerFunctionPreset({
      key: "TEXT:ENDS_WITH",
      operand: "TEXT",
      operator: "ENDS_WITH",
      preset: "STRING_ENDS_WITH",
    });

    await engine1.compileAndStore("custom-text-rule", {
      operand: "TEXT",
      operator: "ENDS_WITH",
      subject: "candidate.email",
      reference: "@company.com",
    });

    const engine2 = await createSemanticEngine({ storage });
    const reloaded = await engine2.executeById("custom-text-rule", {
      candidate: { email: "dev@company.com" },
    });

    expect(reloaded).not.toBeNull();
    expect(reloaded?.result).toBe(true);
    expect(await engine2.listRuleIds()).toContain("custom-text-rule");
  });

  it("evaluates DATE operators with ISO strings", async () => {
    const storage = new InMemoryCompiledRuleStorageAdapter();
    const engine = await createSemanticEngine({ storage });

    await engine.compileAndStore("recently-contacted-company", {
      operand: "DATE",
      operator: "AFTER",
      subject: "company.last_contacted_at",
      reference: "2026-03-12T05:30:36.599Z",
    });

    const output = await engine.executeById("recently-contacted-company", {
      company: {
        last_contacted_at: "2026-03-12T06:30:36.599Z",
      },
    });

    expect(output).not.toBeNull();
    expect(output?.result).toBe(true);
  });
});
