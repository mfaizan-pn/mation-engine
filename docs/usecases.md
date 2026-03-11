# Universal Use Cases: Frontend, Backend, DB

The goal is one general condition contract used across layers.

## 1) Single universal condition format

Define condition once:

```ts
const universalRule = {
  id: "candidate-eligibility-v1",
  definition: {
    combinator: "OR",
    conditions: [
      {
        combinator: "AND",
        conditions: [
          {
            operand: "STRING",
            operator: "CONTAINS",
            subject: "candidate.email",
            reference: "aol.com",
          },
          {
            operand: "NUMBER",
            operator: "GREATER_THAN",
            subject: "candidate.experienceYears",
            reference: 2,
          },
        ],
      },
      {
        operand: "NUMBER",
        operator: "GREATER_THAN",
        subject: "candidate.experienceYears",
        reference: 5,
      },
    ],
  },
};
```

## 2) Frontend use

**Where it fits:** builder UI, preview, simulation.

- Build/edit the same `definition` JSON.
- Send that JSON to backend on save.
- Optionally run preview in browser (if engine package is shared client-side).

## 3) Backend use

**Where it fits:** rule lifecycle + runtime decisioning.

```ts
engine.registerRule(universalRule);

const stored = engine.getRule("candidate-eligibility-v1");
if (!stored) throw new Error("Rule not found");

const evaluation = engine.service.evaluate(stored.ast, {
  candidate: { email: "dev@aol.com", experienceYears: 3 },
});
```

Use output:
- `evaluation.result` -> decision boolean
- `evaluation.trace` -> debugging/observability

## 4) Database use

**Where it fits today (MVP):**
- Store universal rule JSON and metadata.
- Store normalized AST (optional, for faster server-side load).

**Where it fits later (planned):**
- Translate universal rules to SQL/Mongo query filters for pushdown.

## 5) Practical layer mapping

- **Frontend**: author rule JSON.
- **Backend**: parse + validate + evaluate JSON.
- **DB**: persist JSON + versioning + metadata.

Same rule, different responsibilities.

## 6) Cross-domain examples (same contract, different data)

### ATS
- Subject paths: `candidate.*`
- Output drives shortlist/routing.

### CRM/Lead
- Subject paths: `lead.*`
- Output drives enrichment/manual review.

### Billing/Entitlements
- Subject paths: `tenant.*`, `usage.*`
- Output drives feature gates.

## 7) Why this universal model works

- Runtime variable resolution (`a.b.c` paths)
- Deterministic boolean output + trace
- No layer-specific condition rewrites
- Extensible catalogs via repository pattern
- Storage and observability hooks built-in
