/**
 * What: Manual runnable MVP demo for parse/validate/evaluate flow.
 * Why: Quick local sanity check without writing tests.
 * How to use:
 * `pnpm mvp:demo`
 */
import { createEngine, RuleInput } from "./index";

const engine = createEngine<Record<string, unknown>>();

const condition: RuleInput = {
  combinator: "AND",
  conditions: [
    {
      operand: "NUMBER",
      operator: "GREATER_THAN",
      subject: "candidate.experienceYears",
      reference: 3,
    },
    {
      operand: "STRING",
      operator: "CONTAINS",
      subject: "candidate.primarySkill",
      reference: "TypeScript",
    },
    {
      operand: "COMMON",
      operator: "EXISTS",
      subject: "candidate.email",
    },
  ],
};

const runtimeVariables = {
  candidate: {
    experienceYears: 5,
    primarySkill: "TypeScript + Node.js",
    email: "candidate@example.com",
  },
};

const result = engine.service.execute(condition, runtimeVariables);
console.log(JSON.stringify(result, null, 2));
