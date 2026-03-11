> What: Integration handbook for adopting this engine in `pnow-ats-v2`.
> Why: Gives practical monorepo setup and usage patterns.
> How to use: Follow sections 1 → 7 in order during integration.

# `pnow-ats-v2` Integration Guide (Phase 5)

This guide shows how to adopt `mation-engine` inside the monorepo at:

`/home/mohammmed-faizan/pnow/pnow-ats-v2`

## 1) Monorepo Wiring

1. Add this package as a workspace dependency in the target app/package:

```json
{
  "dependencies": {
    "mation-engines": "workspace:*"
  }
}
```

2. Install dependencies from monorepo root:

```bash
pnpm install
```

3. Verify this package is healthy before consuming:

```bash
pnpm --filter mation-engines typecheck
pnpm --filter mation-engines test
```

4. Useful docs:

- API registration: `docs/api-registration-guide.md`
- Cross-domain examples: `docs/usecases.md`
- HTTP/Swagger testing: `docs/http-api.md`

## 2) Recommended Runtime Topology

- Bootstrap one engine instance per service process.
- Keep repositories frozen in production (`freezeAfterInit: true`).
- Register tenant/project-specific operators only during startup.
- Resolve runtime variables per request/job payload.

## 3) ATS-Focused Engine Bootstrap

```ts
import { createPnowAtsEngine } from "mation-engines";

const engine = createPnowAtsEngine({
  onRuleEvaluated: ({ result, traceLength }) => {
    console.log("rule evaluated", { result, traceLength });
  },
});
```

## 4) Rule Registration and Execution

```ts
engine.registerRule({
  id: "candidate-shortlist-rule",
  definition: {
    combinator: "AND",
    conditions: [
      {
        operand: "NUMBER",
        operator: "GREATER_THAN",
        subject: "candidate.experience.years",
        reference: 3,
      },
      {
        operand: "STRING",
        operator: "CONTAINS",
        subject: "candidate.skills.primary",
        reference: "TypeScript",
      },
      {
        operand: "COMMON",
        operator: "EXISTS",
        subject: "candidate.contact.email",
      },
    ],
  },
  metadata: {
    tenantId: "tenant_123",
    module: "screening",
  },
});

const registered = engine.getRule("candidate-shortlist-rule");
if (!registered) {
  throw new Error("rule missing");
}

const result = engine.service.evaluate(registered.ast, {
  candidate: {
    experience: { years: 5 },
    skills: { primary: "TypeScript + Node.js" },
    contact: { email: "candidate@company.com" },
  },
});
```

## 5) Persisting Rules (Storage Adapter)

Use a custom adapter implementing `RuleStorageAdapter`:

```ts
import { RuleStorageAdapter, ConditionDefinition } from "mation-engines";

class AtsRuleStorageAdapter implements RuleStorageAdapter {
  async saveRule(rule: ConditionDefinition): Promise<void> {
    // upsert into DB
  }

  async loadRule(id: string): Promise<ConditionDefinition | null> {
    // select by id
    return null;
  }

  async listRules(): Promise<ReadonlyArray<ConditionDefinition>> {
    // list all for tenant/module
    return [];
  }
}
```

Then wire it:

```ts
import { createPnowAtsEngine } from "mation-engines";

const engine = createPnowAtsEngine({}, new AtsRuleStorageAdapter());
```

## 6) Suggested ATS Data Contract

- Use dot-path subjects only for runtime lookup (`candidate.profile.email`).
- Keep references literal by default unless explicitly configured as variable.
- Add `tenantId`, `workflowId`, and `version` in rule metadata.
- Store original input + normalized AST for debugging.

## 7) Production Hardening Checklist

- Validate incoming rule payloads before registration.
- Enforce tenant-level operator allow-list.
- Emit `onValidationFailed` and `onRuleEvaluated` to observability pipeline.
- Keep extension registration at startup only (not request path).
- Version rules and prefer soft-delete over hard-delete.
