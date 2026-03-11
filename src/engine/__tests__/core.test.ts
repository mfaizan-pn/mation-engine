/**
 * What: Core unit/integration tests for MVP engine flow.
 * Why: Verifies repository safety, resolver correctness, execution behavior.
 * How to use:
 * `pnpm test` (runs this via Vitest).
 */
import { describe, expect, it } from "vitest";
import {
  createEngine,
  DotPathVariableResolver,
  MemoryRepository,
} from "../../index";

describe("repositories", () => {
  it("prevents writes after freeze", () => {
    const repository = new MemoryRepository<string, number>();
    repository.register("a", 1);
    repository.freeze();
    expect(() => repository.register("b", 2)).toThrowError(
      "Repository is frozen and cannot be mutated.",
    );
  });
});

describe("variable resolver", () => {
  it("resolves dot path values", () => {
    const resolver = new DotPathVariableResolver<Record<string, unknown>>();
    const value = resolver.resolve("candidate.profile.email", {
      candidate: { profile: { email: "user@example.com" } },
    });

    expect(value).toBe("user@example.com");
  });
});

describe("parse validate evaluate", () => {
  it("executes conjunction successfully", () => {
    const engine = createEngine<Record<string, unknown>>();
    const output = engine.service.execute(
      {
        combinator: "AND",
        conditions: [
          {
            operand: "NUMBER",
            operator: "GREATER_THAN",
            subject: "candidate.experienceYears",
            reference: 3,
          },
          {
            operand: "COMMON",
            operator: "EXISTS",
            subject: "candidate.email",
          },
        ],
      },
      { candidate: { experienceYears: 5, email: "test@example.com" } },
    );

    expect(output.isValid).toBe(true);
    expect(output.result).toBe(true);
    expect(output.trace.length).toBeGreaterThan(0);
  });

  it("supports AST serialization round trip", () => {
    const engine = createEngine<Record<string, unknown>>();
    const ast = engine.service.parse({
      operand: "NUMBER",
      operator: "GREATER_THAN",
      subject: "candidate.experienceYears",
      reference: 3,
    });

    const payload = engine.service.serialize(ast);
    const restored = engine.service.deserialize(payload);
    const evaluation = engine.service.evaluate(restored, {
      candidate: { experienceYears: 10 },
    });

    expect(evaluation.result).toBe(true);
  });

  it("short-circuits AND evaluation", () => {
    const engine = createEngine<Record<string, unknown>>({
      freezeAfterInit: false,
    });

    let calls = 0;
    engine.registerOperator({
      key: "PING",
      operand: "COMMON",
      arity: 1,
    });
    engine.registerFunction({
      key: "COMMON:PING",
      operand: "COMMON",
      operator: "PING",
      signature: () => {
        calls += 1;
        return true;
      },
    });

    const output = engine.service.execute(
      {
        combinator: "AND",
        conditions: [
          {
            operand: "NUMBER",
            operator: "GREATER_THAN",
            subject: "candidate.experienceYears",
            reference: 10,
          },
          {
            operand: "COMMON",
            operator: "PING",
            subject: "candidate.email",
          },
        ],
      },
      { candidate: { experienceYears: 2, email: "test@example.com" } },
    );

    expect(output.result).toBe(false);
    expect(calls).toBe(0);
  });
});
