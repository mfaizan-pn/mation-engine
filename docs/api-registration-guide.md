# API Registration Guide (Operands, Operators, Functions, Conditions)

This guide shows exactly how to use the current MVP APIs.

## 1) Create engine

If you want to register new items **after** startup, keep repositories mutable:

```ts
import { createEngine } from "mation-engines";

const engine = createEngine<Record<string, unknown>>({
  freezeAfterInit: false,
});
```

If you use defaults (`includeDefaults: true`, default behavior), common catalogs are already loaded.

---

## 2) Register an operand

Use this when introducing a new category (example: `TEXT`):

```ts
engine.registerOperand({
  key: "TEXT",
  group: "EVALUATION",
  description: "Text-specific operations",
});
```

---

## 3) Register an operator

Operators belong to an operand and can define arity:

```ts
engine.registerOperator({
  key: "ENDS_WITH",
  operand: "TEXT",
  arity: 2,
  description: "Checks string suffix",
});
```

---

## 4) Register a function implementation

Function keying is `operand:operator` under the hood.

```ts
engine.registerFunction({
  key: "TEXT:ENDS_WITH",
  operand: "TEXT",
  operator: "ENDS_WITH",
  signature: (left: unknown, right: unknown) =>
    typeof left === "string" &&
    typeof right === "string" &&
    left.endsWith(right),
});
```

---

## 5) Register a condition (stored rule)

A condition is saved in condition repository as parsed AST + metadata.

```ts
engine.registerRule({
  id: "candidate-email-domain-check",
  definition: {
    operand: "TEXT",
    operator: "ENDS_WITH",
    subject: "candidate.email",
    reference: "@company.com",
  },
  metadata: {
    tenantId: "tenant_123",
    module: "screening",
    version: 1,
  },
});
```

---

## 6) Execute a stored condition

```ts
const rule = engine.getRule("candidate-email-domain-check");
if (!rule) throw new Error("Rule not found");

const result = engine.service.evaluate(rule.ast, {
  candidate: { email: "dev@company.com" },
});

console.log(result.result); // true/false
console.log(result.trace);  // execution trace
```

---

## 7) Execute two or more conditions together (AND/OR)

You can combine many conditions with nested groups.

Example logic:

`(email contains "aol.com" AND experience > 2) OR experience > 5`

```ts
const output = engine.service.execute(
  {
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
  {
    candidate: { email: "dev@aol.com", experienceYears: 3 },
  },
);
```

---

## 8) Register composite conjunction directly and execute

```ts
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
  {
    candidate: { experienceYears: 5, email: "x@y.com" },
  },
);
```

---

## 9) Important notes

- If `freezeAfterInit: true`, registration APIs will throw after startup.
- Validate before production registration (schema checks can be layered with `zod`).
- Prefer startup-time registration for operands/operators/functions.
- Store rule metadata (`tenantId`, `workflowId`, `version`) for traceability.
