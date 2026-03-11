# Rule Engine MVP TODO

> Project: `mation-engine`  
> Primary consumer target: `/home/mohammmed-faizan/pnow/pnow-ats-v2` (monorepo)

## 1) MVP Outcome (Definition of Done)

- [x] Library can **parse**, **validate**, and **evaluate** rule conditions with runtime variable resolution.
- [x] Operators/operands/conditions/functions are loaded via repositories (not hardcoded in business flow).
- [x] Repositories are initialized once at startup and cached in memory for fast access.
- [x] Public API is developer-friendly and typed for signatures (input/output contracts).
- [x] Rule definitions can be serialized/deserialized safely for storage.
- [ ] Basic tests cover core happy paths + edge cases.

---

## 2) Current Gaps (from repo baseline)

- [ ] `src/types/rules/index.ts` mixes domain constants, runtime examples, and duplicate helper definitions.
- [x] No AST model for unary/binary/composite conditions (`operations/*` are empty).
- [x] No function repository abstraction (registry lifecycle missing).
- [x] No operator/operand/condition repository abstraction.
- [x] No startup bootstrap to hydrate in-memory repositories.
- [x] No runtime variable resolver abstraction.
- [x] No parser/validator/evaluator service signatures and orchestration flow.
- [ ] No tests framework configured.

---

## 3) Architecture Tasks (MVP Slice)

### 3.1 Core contracts and signatures
- [x] Define strict interfaces in `src/core/contracts/*`:
  - [x] `RuleParser<TInput, TAst>`
  - [x] `RuleValidator<TAst, TContext>`
  - [x] `RuleEvaluator<TAst, TContext, TResult>`
  - [x] `VariableResolver<TContext>`
  - [x] `Serializer<TAst, TSerialized>`

### 3.2 AST and condition model
- [x] Implement AST node types:
  - [x] Literal/Value node
  - [x] Variable/Path node
  - [x] Unary operation node
  - [x] Binary operation node
  - [x] Group/combinator node (`AND`/`OR`)
- [x] Implement `src/types/rules/operations/unary.ts`.
- [x] Implement `src/types/rules/operations/binary.ts`.
- [x] Implement `src/types/rules/components/operands.ts` with typed operand metadata.

### 3.3 Repository pattern (passive layer)
- [x] Create repositories under `src/repositories/*`:
  - [x] `FunctionRepository`
  - [x] `OperatorRepository`
  - [x] `OperandRepository`
  - [x] `ConditionRepository` (stored definitions)
- [x] Define shared repository contract:
  - [x] `register()`
  - [x] `registerMany()`
  - [x] `get()`
  - [x] `has()`
  - [x] `list()`
  - [x] `freeze()` (immutable after bootstrap)
- [x] Add in-memory adapter implementations (Map-backed, O(1) lookup).
- [x] Add startup bootstrap service to hydrate repositories at app init.

### 3.4 Active services (parse/validate/evaluate)
- [x] Build `ASTBuilder` (API payload → AST).
- [x] Build `RuleValidator`:
  - [x] signature arity check
  - [x] operand/operator compatibility check
  - [ ] variable presence/path validation (schema-aware optional)
- [x] Build `Interpreter/Evaluator`:
  - [x] resolve variables at runtime from context
  - [x] fetch operator function from repository
  - [x] execute node recursively with short-circuit logic
- [x] Build `Serializer/Deserializer` for AST/rule definitions.

### 3.5 API layer (developer-facing)
- [x] Function-based API:
  - [x] `createEngine(config)`
  - [x] `parse(ruleInput)`
  - [x] `validate(ast, contextSchema?)`
  - [x] `evaluate(ast, runtimeContext)`
- [x] Rule management API:
  - [x] `registerRule()`
  - [x] `updateRule()`
  - [x] `removeRule()`
  - [x] `getRule()`
- [x] Extension API:
  - [x] `registerOperator()`
  - [x] `registerFunction()`
  - [x] `registerOperand()`

### 3.6 Integration layer (MVP)
- [x] Define function repository persistence boundary (in-memory now, storage adapter-ready).
- [x] Define storage adapter interface (no heavy implementation in MVP):
  - [x] `saveRule()`
  - [x] `loadRule()`
  - [x] `listRules()`
- [x] Add minimal event hooks:
  - [x] `onRuleEvaluated`
  - [x] `onValidationFailed`
  - [x] `onRuleRegistered`

---

## 4) Refactor Plan for Existing Files

- [ ] Keep `utils/createOperands.ts` as shared typed utility.
- [ ] Refactor `src/types/rules/index.ts` into:
  - [ ] constants/catalog only
  - [ ] pure function implementations only
  - [ ] remove demo calls from module scope
  - [ ] remove duplicate `createOperands`/`OperandMap` definitions
- [ ] Keep `zod` schemas focused (rule schema + operator/function signature schemas).

---

## 5) Testing and Quality Gates

- [x] Setup test runner (`vitest` preferred for MVP speed).
- [x] Add unit tests:
  - [x] repository registration/lookup/freeze behavior
  - [x] variable resolver path resolution
  - [x] parser + validator compatibility checks
  - [x] evaluator short-circuit behavior
- [x] Add integration tests:
  - [x] parse → validate → evaluate end-to-end
  - [x] serialized rule round-trip
- [x] Add `npm` scripts:
  - [x] `typecheck`
  - [x] `test`
  - [x] `test:watch`

---

## 6) Suggested Execution Order

- [x] Phase 1: contracts + repositories + bootstrap
- [x] Phase 2: AST + parser + serializer
- [x] Phase 3: validator + evaluator + variable resolver
- [x] Phase 4: API surface + tests + examples
- [x] Phase 5: pnow-ats-v2 integration guide

---

## 7) First Demo Scenario (Acceptance)

- [x] Input: conjunction of conditions + runtime variable object.
- [x] Engine: parse + validate + evaluate.
- [x] Output: deterministic boolean (`true`/`false`) + evaluation trace metadata.

---

## 8) Notes for pnow-ats-v2 Adoption

- [x] Keep package API stable and framework-agnostic.
- [x] Prefer pure functions + stateless evaluators for easy monorepo reuse.
- [x] Keep repositories injectable for tenant-specific extension in ATS flows.
- [x] Add migration note once condition format is finalized.

---

## 9) Local API MVP (Manual Testing)

- [x] Add HTTP API server with Swagger docs endpoint.
- [x] Add typed HTTP client interface for register/get/execute.
- [x] Add MinIO storage adapter for startup rule preload.
- [x] Add async engine bootstrap to load persisted rules on startup.
