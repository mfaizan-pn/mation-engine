# Semantic Engine Architecture

This document explains what each major module does, why it exists, and how it works. It follows the compile-time and runtime flow used in this repository.

## 1) Registry (source of truth)

**What it does**
- Defines allowed rule categories, operands, operators, and runtime function presets.
- Provides stable numeric IDs for all semantics.

**Why it exists**
- Enforces a closed-world model so only registered semantics are valid.
- Guarantees stable identity for storage, hashing, and translation.

**How it works**
- `registerOperand`, `registerOperator`, and `registerFunctionPreset` compute stable IDs and store definitions in internal maps. See `src/semantic/registry.ts:52`.
- Operator identity is `"${operand}:${operator}"`, used for compile-time lookup and registry checks.
- `getSnapshot()` and `hydrateExtensions()` persist and restore runtime extensions. See `src/semantic/registry.ts:272`.

## 2) Parser (input → universal DSL)

**What it does**
- Converts external `RuleInput` into a universal DSL tree.

**Why it exists**
- Separates user-facing syntax from the canonical semantic model.
- Keeps downstream steps deterministic and consistent across input formats.

**How it works**
- `toSubjectRef` and `toReferenceRef` resolve path vs literal semantics. See `src/semantic/parser.ts:21`.
- `toDslNode` recursively lowers nested groups into logical nodes. See `src/semantic/parser.ts:55`.
- `parse` returns a `UniversalDslRule` with `ruleId`, `root`, and metadata. See `src/semantic/parser.ts:71`.

## 3) Normalizer (canonical DSL)

**What it does**
- Flattens and sorts logical nodes to produce a deterministic structure.

**Why it exists**
- Logical operators like `AND`/`OR` are associative and commutative; canonicalization makes equivalent rules identical for hashing and storage deduplication.

**How it works**
- Recursively normalizes children, flattens nested same-operator groups, then sorts children by a stable JSON string. See `src/semantic/normalizer.ts:11`.

## 4) Validator (registry-backed legality)

**What it does**
- Checks that operands/operators exist in the registry and that arity matches input.

**Why it exists**
- Prevents unsupported semantics from entering storage or execution.

**How it works**
- Ensures operator is registered for the operand and a runtime function exists. See `src/semantic/validator.ts:33`.
- Enforces arity rules for unary/binary operators. See `src/semantic/validator.ts:55`.

## 5) IR Lowering (DSL → canonical AST/IR)

**What it does**
- Converts DSL nodes into a machine-oriented IR that references only stable IDs and pool indexes.

**Why it exists**
- The canonical IR is the persisted, portable representation of a rule.

**How it works**
- Symbols (paths) and literals are interned into pools with stable indexes. See `src/semantic/ir.ts:15` and `src/semantic/ir.ts:36`.
- Logical nodes store operator IDs and child indexes; comparison nodes store operand/operator IDs and value references. See `src/semantic/ir.ts:57`.

## 6) Codec (serialization + compression)

**What it does**
- Serializes canonical IR to bytes, compresses with zstd, and packs metadata + payload into a binary blob.

**Why it exists**
- Implements the required storage format: compact, hashable, integrity-checked.

**How it works**
- `buildCompiledArtifact` serializes IR, compresses, and computes `canonical_hash` and `checksum`. See `src/semantic/codec.ts:70`.
- `packCompiledArtifact` frames metadata + payload with a 4-byte length prefix. See `src/semantic/codec.ts:36`.
- `decodeCompiledIr` verifies hashes and returns the deserialized IR. See `src/semantic/codec.ts:90`.

## 7) Compiler (end-to-end compile pipeline)

**What it does**
- Implements compile-time pipeline from input to stored artifact.

**Why it exists**
- Produces a portable, metadata-rich compiled rule asset once, stored by ID.

**How it works**
- Runs parse → normalize → validate → lower → encode. See `src/semantic/compiler.ts:49`.
- Gathers referenced fields and operator/operand usage for metadata. See `src/semantic/compiler.ts:12`.

## 8) Runtime (load/execute by rule ID)

**What it does**
- Loads compiled artifacts, verifies integrity, and executes the rule.
- Preloads all rules into memory at engine startup to remove load-time latency.

**Why it exists**
- Enables rule-ID-first execution across environments.

**How it works**
- `preloadAllArtifacts` loads and decodes all rules into memory caches. See `src/semantic/runtime.ts:98`.
- `executeById` resolves the canonical IR and evaluates nodes using registry functions. See `src/semantic/runtime.ts:75`.

## 9) Storage Adapters (persistence)

**What it does**
- Abstracts persistence for compiled artifacts and registry extensions.

**Why it exists**
- Keeps core pipeline independent of storage backend.

**How it works**
- In-memory adapter is used for tests and local runs. See `src/integrations/storage/inMemoryCompiledRuleStorageAdapter.ts:1`.
- MinIO adapter provides object storage persistence. See `src/integrations/storage/minioCompiledRuleStorageAdapter.ts:1`.

## 10) Engine (facade)

**What it does**
- Provides a simple interface: compile/store, execute by ID, register extensions, list metadata.

**Why it exists**
- Hides plumbing and preserves the canonical pipeline semantics.

**How it works**
- Builds registry, codec, runtime, compiler; preloads all rules. See `src/semantic/engine.ts:78`.

## 11) CLI and Utilities

**What it does**
- CLI provides interactive rule creation, execution, and pipeline inspection.
- `showPipelineStages.ts` prints each compile stage for a rule.

**Why it exists**
- Makes debugging and exploration easy without custom code.

**How it works**
- CLI uses the engine and pipeline snapshot. See `src/cli/index.ts:1`.
- Pipeline stage printer is in `src/semantic/showPipelineStages.ts:1`.

## Summary of the End-to-End Flow

1. **Input**: `RuleInput` is provided by user or caller.
2. **Parse**: Convert into universal DSL (`UniversalDslRule`).
3. **Normalize**: Canonicalize logical structure.
4. **Validate**: Ensure registry legality and arity correctness.
5. **Lower**: Convert to canonical IR (IDs + pools).
6. **Encode**: Serialize + compress + hash.
7. **Store**: Persist binary artifact by rule ID.
8. **Runtime**: Preload all rules into memory, execute by ID with no load-time delay.
