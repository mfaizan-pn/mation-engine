# HTTP API + Swagger Manual Testing Guide

Use this when you want to test MVP without integrating into another service.

## 1) Start API server

```bash
pnpm api:dev
```

Open docs:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/documentation/json`
- Scalar UI: `http://localhost:3000/scalar`

## 2) Core endpoints

- `POST /operands/register`
- `POST /operators/register`
- `POST /functions/register` (preset-based)
- `POST /rules/register`
- `GET /rules`
- `GET /rules/:id`
- `DELETE /rules/:id`
- `POST /rules/execute` (direct input + context)
- `POST /rules/:id/execute` (stored rule + context)

All write/execute endpoints now include request-body schema + example in docs.
You can click an endpoint, press **Try it out**, and only edit values.
Routes also include explicit `400` validation and `404` not-found response schemas.

## 3) Function registration via presets

For API safety/simplicity, function registration is preset-driven:

- `STRING_CONTAINS`
- `STRING_ENDS_WITH`
- `NUMBER_GREATER_THAN`
- `COMMON_EXISTS`

Example payload:

```json
{
  "key": "TEXT:ENDS_WITH",
  "operand": "TEXT",
  "operator": "ENDS_WITH",
  "preset": "STRING_ENDS_WITH"
}
```

## 4) MinIO-backed startup preload

If you want rules loaded from MinIO on service start:

```bash
export RULE_STORAGE_PROVIDER=minio
export MINIO_ENDPOINT=127.0.0.1
export MINIO_PORT=9000
export MINIO_USE_SSL=false
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_BUCKET=rule-engine
export MINIO_RULE_PREFIX=rules
pnpm api:dev
```

The adapter now reads MinIO values directly from environment via:

- `MinioRuleStorageAdapter.fromEnv()`

Behavior:

- On startup, API uses `createEngineAsync(...)` and pulls existing rules from MinIO.
- New/updated/deleted rules are written back via storage adapter.
- Runtime evaluation reads from in-memory repositories (fast path).

## 5) Typed client usage

```ts
import { RuleEngineHttpClient } from "mation-engines";

const client = new RuleEngineHttpClient("http://localhost:3000");

await client.registerOperand({ key: "TEXT", group: "EVALUATION" });
await client.registerOperator({ key: "ENDS_WITH", operand: "TEXT", arity: 2 });
await client.registerFunction({
  key: "TEXT:ENDS_WITH",
  operand: "TEXT",
  operator: "ENDS_WITH",
  preset: "STRING_ENDS_WITH",
});

await client.registerRule({
  id: "email-domain",
  definition: {
    operand: "TEXT",
    operator: "ENDS_WITH",
    subject: "candidate.email",
    reference: "@company.com",
  },
});

const output = await client.executeStored("email-domain", {
  candidate: { email: "dev@company.com" },
});
```
