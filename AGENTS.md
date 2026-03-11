# Agent Guide for mation-engine

Purpose: This guide equips contributors and automation agents with the full working context of this repository so you can extend the universal conditional logic + automation engine safely, consistently, and quickly.

Scope: Applies to the entire repository.

Status (2026-03-06): Core type scaffolding and operator catalogs are present. Execution engine, translators, and parsers are described in `README.md` and partially prototyped in types; they are not fully implemented in `src/` yet.


## 1) High-Level Overview
- Vision: “LLVM(Low-Level Virtual Machine) for Conditional Logic.” Define once, execute anywhere, translate to many targets (SQL, MongoDB, UI React predicates, workflows).
- Pillars:
  - Universal IR for conditions and tasks.
  - Type-safe operator catalogs and pure evaluation functions.
  - Bidirectional adapters: parsers (→ IR) and translators (IR → targets).
  - Observability by design: tracing, timing, and metrics on condition/task execution.


## 2) Repository Structure
- Root
  - `README.md`: Full product vision, architecture, IR, translators, task engine design, examples, and roadmap.
  - `package.json`: Tooling and minimal runtime deps (`typescript`, `ts-node`, `@types/node`, `zod`).
  - `tsconfig.json`: CommonJS, ES2016 target. Adjust as build evolves.
  - `.gitignore`: Node modules, tool versions.
- `src/`
  - `index.ts`: Domain inventory and taxonomy notes for triggers, rules, and actions; ideation entry.
  - `example.ts`: Realistic automation payload for a lead-enrichment workflow (trigger → conditions → actions → optional delay → flow graph shell).
  - `types/`
    - `index.ts`: Barrel exporting domain subpackages.
    - `actions/index.ts`: Placeholder `IAction` interface.
    - `metrics/index.ts`: Placeholder `IMetric` interface.
    - `triggers/index.ts`: Placeholder `ITrigger` interface.
    - `rules/index.ts`: Core rule scaffold:
      - Rule groups: `EVALUATION`, `VALIDATION`, `AUTHORIZATION` (+ `USER` reserved).
      - Operand namespaces under `EVALUATION`: `STRING`, `NUMBER`, `DATE`, `ARRAY`, `OBJECT`, `JSON`, `COMMON`.
      - Operator catalogs per operand with strongly typed keys (via `createOperands`).
      - Pure operator implementations collected under `functions[operand][operator]`.
    - `rules/components/operands.ts`: Reserved for operand componentization (currently a stub).
    - `rules/operations/{unary,binary}.ts`: Reserved for IR node modeling of operations (stubs).
- `utils/`
  - `createOperands.ts`: Strongly typed string-literal map creator used for rule/operand/operator catalogs.
- `interfaces/`
  - `operandMap.d.ts`: `OperandMap<T extends string>` generic leveraged by `createOperands`.


## 3) Core Concepts and IR
- Rule Groups
  - `EVALUATION`: Data value checks across types.
  - `VALIDATION`: Signature/type constraints (planned; pair with `zod`).
  - `AUTHORIZATION`: Capability constraints (e.g., `CAN`, `LIMITED`).
- Operands/Operators (EVALUATION)
  - `STRING`: `EQUALS`, `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `LENGTH_*`.
  - `NUMBER`: `EQUALS`, `GREATER_THAN`, `LESS_THAN`, `AROUND(threshold)`, `IS_NEGATIVE`, `IS_ZERO`, `IS_DECIMAL`, `IS_PRECISION`, `BETWEEN`, `IS_EVEN`, `IS_DIVISIBLE_BY`, `IS_MULTIPLE_OF`, `IS_FACTOR_OF`.
  - `DATE`: `EQUALS`, `BEFORE`, `AFTER`, `BETWEEN` (Date objects).
  - `ARRAY`: `CONTAINS`, `EQUALS`, `LENGTH_*`, `LENGTH_BETWEEN`, `SATISFIES(predicate)`.
  - `OBJECT`: `EQUALS` (shallow structural), `CONTAINS` (key existence), `SATISFIES(k,v→bool)`.
  - `JSON`: `EQUALS` (parse+structural eq), `SATISFIES(obj→bool)`. Guards invalid JSON by returning `false`.
  - `COMMON`
    - `LOGICAL`: `AND(...booleans)`, `OR(...booleans)` with short-circuit potential in engine.
    - `ASSERTION`: `ASSERT(a)`, `ASSERT_NOT(a)`.
    - `NULLISH`: `IS_EMPTY`, `IS_NAN`, `IS_NULL`, `IS_UNDEFINED`, `EXISTS`.
- Purity: All operator functions are pure and side-effect-free to keep evaluation deterministic and testable.


## 4) Example Automation Data Model (`src/example.ts`)
A complete seed payload for a lead-processing automation:
- Trigger: Kafka event on topic `leads-topic` for `lead.record.created.success`.
- Conditions: SIMPLE checks like `EXISTS`, `MATCHES_REGEX`, `EQUALS`, on paths such as `data.lead.email`, `apollo.company.id`.
- Actions: Heterogeneous orchestration including `DATA_UPDATE`, `UPDATE_LEAD`, `HTTP_REQUEST` to external `Apollo`, `CUSTOM_FUNCTION` services (`DomainExtractor`, `LeadScorer`, `FollowUpScheduler`, `MetricsService`), `ASSIGN_TO_USER`, and `NOTIFICATION_SEND`.
- Delay: Optional fixed delay before enrichment.
- Flow Graph: Empty shell to be populated by a React Flow-based UI (nodes/edges versioned storage).
Use this as a contract specimen for DB schemas, UI builders, and later translators.


## 5) Planned Execution Engines (per README)
- ConditionExecutor
  - Resolve subject → choose operand/operator → evaluate.
  - Observability: trace span with `condition.id`, type, result, duration.
  - Optimizations: short-circuit logicals, optional caching for expensive sub-expressions.
- TaskExecutionEngine
  - Build dependency DAG, topological sort, and execute in concurrent queues.
  - Retry policies in task metadata; capture per-task result typing.
  - Metrics hooks for throughput and failure classification.
These are design targets; implement incrementally inside `src/` with unit tests.


## 6) Parsers and Translators (per README)
- Parsers (external format → IR): `UIBuilderParser`, `SQLParser`, `YAMLParser`, `JSONLogicParser`.
- Translators (IR → target): `SQLTranslator`, `MongoTranslator`, `ReactTranslator`.
- Mapping: Maintain explicit operator mapping tables per translator; avoid implicit guessing. Add golden tests to guarantee parity among backends for equivalent conditions.


## 7) Build, Run, and Type-Check
- Install deps: `npm i` (or `pnpm i`).
- Type-check: `npx tsc --noEmit`.
- Dev runs: `npx ts-node src/example.ts` (validates structure/types; no runtime engine yet).
- Tests: None configured yet—see section 10 for recommendations.


## 8) Coding Standards
- Language: TypeScript. Prefer strict typing and explicit parameter types.
- Operator catalogs: Define keys via `createOperands` to preserve literal types.
- Function style: Pure, deterministic, no I/O or ambient globals. Keep functions small and self-describing.
- Error handling: Return booleans; validation layers (e.g., `zod`) should verify shapes before evaluation.
- Naming: Match operator names exactly in code maps (e.g., `GREATER_THAN`).
- Layout: Keep domain types under `src/types/*`. Utility helpers in `utils/*`. Avoid circular references.


## 9) Extensibility Playbooks
- Add a new operand category
  1. Define the operand key under the appropriate group using `createOperands`.
  2. Declare operator keys for that operand.
  3. Implement pure functions in the `functions[operand]` map 1:1 with keys.
  4. Document runtime expectations (arg types, edge cases) and add tests.
- Add a new operator to an existing operand
  1. Append the operator key in the operand’s `createOperands([...])` list.
  2. Implement function with precise param contracts.
  3. Update translator mapping tables (SQL/Mongo/React) where applicable.
  4. Add unit tests + translator golden tests.
- Add a parser/translator
  1. Create a dedicated module under `src/parsers` or `src/translators`.
  2. Define clean interfaces (e.g., `ConditionParser`, `ConditionTranslator`).
  3. Provide an explicit operator mapping table.
  4. Add round-trip tests (format → IR → format) where feasible.


## 10) Testing Strategy (Recommended)
- Unit tests (operators)
  - Table-driven tests for each operator with valid/invalid/edge inputs.
  - Pay special attention to: numeric precision (`IS_PRECISION`), `BETWEEN` boundaries, JSON parse failures, date comparisons.
- Integration tests
  - Parser → IR → Translator golden tests to ensure consistent semantics across backends.
  - Execution engine tests for DAG correctness and concurrency behavior.
- Property-based tests
  - For equivalence of logically identical conditions and round-trips.
- Suggested tooling: `vitest` or `jest` + `ts-node` + `tsconfig.test.json`.


## 11) Observability and Performance
- Tracing: Expose hooks to record `condition.id`, inputs (sanitized), result, and duration. Keep operator functions pure; perform tracing at orchestration boundaries.
- Metrics: Counters for operator invocations, histograms for duration, error rates for invalid inputs.
- Optimizations: short-circuit evaluation, optional caching (JSON parse, expensive predicates), batch strategies for arrays/objects.


## 12) Security and Safety
- Input validation: Use `zod` at the boundaries (parsers, API) to coerce/validate types before evaluation.
- Injection safety: Translators must parameterize values (never string-concatenate untrusted inputs into SQL, etc.).
- Sandboxing: Custom functions and HTTP requests (referenced by actions) must be executed in controlled environments with timeouts and retry policies.


## 13) Contribution Workflow
- Branching: Feature branches; small PRs.
- Commits: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
- Documentation: Update this guide and `README.md` when adding operators, operands, translators, or engine features.
- Code review checklist
  - Types accurate and exported where needed.
  - Operator catalogs and implementations consistent and complete.
  - No side effects in operators; tests cover typical and edge inputs.
  - Translators use explicit mapping and safe parameterization.


## 14) Current Gaps and Next Steps
- Implement a minimal `ConditionExecutor` in `src/engine/conditions.ts` with pluggable tracing hooks.
- Scaffold `src/translators/{sql,mongo,react}/index.ts` with explicit operator maps.
- Introduce `src/parsers/{ui,yaml,jsonlogic,sql}/index.ts` stubs and `zod` schemas.
- Add a `vitest` test harness and cover all operators in `src/types/rules/index.ts`.
- Flesh out `rules/components/operands.ts` and `rules/operations/{unary,binary}.ts` to model IR nodes explicitly if needed by translators/visualizers.


## 15) Quick Pointers
- Typed catalog helper: `utils/createOperands.ts`
- Rule implementations: `src/types/rules/index.ts`
- Example automation payload: `src/example.ts`
- Shared map type: `interfaces/operandMap.d.ts`
