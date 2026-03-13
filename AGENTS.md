# AGENTS.md

## Purpose

This agent is responsible for designing, maintaining, and operating the **Universal Conditional Logic Engine**.

The engine is a layered system for authoring, compiling, storing, loading, translating, executing, and observing conditional logic across multiple platforms and runtimes.

The engine must allow a condition to be:

- defined once,
- compiled once,
- stored once,
- referenced by ID,
- materialized into the required execution/output form in any supported layer.

This system should be treated as the **LLVM for conditional logic**:
a universal semantic pipeline between many input formats and many output targets.

---

# Core Understanding

The engine is built around a **registry-driven semantic model**.

At bootstrap time, every service has access to the same default registry of:

- rules
- operands
- operators
- functions
- validation contracts
- execution semantics

All valid conditions must be formed from this registry.

This means the engine is **closed-world by default**:
only registered logic is valid unless explicitly extended.

The engine is not an arbitrary eval system.
It is a controlled, typed, serializable, portable conditional logic compiler/runtime.

---

# System Layers

The engine consists of the following architectural layers.

## 1. Input Layer

Responsible for receiving conditions from external systems.

Examples:
- frontend builders
- JavaScript/TypeScript expressions
- JSON configs
- YAML definitions
- SQL fragments
- low-code tools
- legacy APIs
- future voice or NL interfaces

The input layer is user-facing or system-facing and may be language-specific.

## 2. Parser Layer

Responsible for converting source input into structured parsed representations.

This layer understands source syntax, source-language semantics, and diagnostics.

Its job is not execution.
Its job is syntax interpretation and semantic extraction.

## 3. Universal DSL Layer

Responsible for representing conditions in a language-agnostic semantic form.

This is the canonical interchange layer between:
- source parsing
- validation
- normalization
- translation
- execution planning

The DSL removes source-language syntax noise while preserving condition meaning.

## 4. Canonical AST / IR Layer

Responsible for representing the DSL in a canonical machine-oriented form.

This is the persisted rule form and the main storage source of truth.

It must be:
- typed
- canonical
- compact
- deterministic
- registry-backed
- versioned

## 5. Translator Layer

Responsible for materializing the semantic rule into target-specific forms.

Examples:
- TypeScript evaluator form
- Python evaluator form
- Go evaluator form
- SQL query
- MongoDB filter
- GraphQL filter
- React-compatible expression
- workflow engine condition object

The translator layer must be target-aware but semantically consistent.

## 6. Output Layer

Responsible for returning the final target artifact or execution result.

Outputs may include:
- a boolean result
- a query object
- a SQL fragment with parameters
- a target-language expression
- a workflow rule
- an execution plan
- a debugging/explanation artifact

## 7. Observability Layer

Responsible for tracing, metrics, diagnostics, explainability, and operational visibility.

It must provide insight into:
- parse behavior
- validation results
- normalization
- translation
- execution
- performance
- failure reasons

---

# Primary Product Model

The engine turns conditions into **portable compiled assets**.

A condition is not just source text.
It becomes a reusable rule asset with:

- an ID
- a canonical semantic representation
- a machine-storable form
- target-independent meaning
- target-specific execution capability

This means business logic is no longer duplicated manually across frontend, backend, and database layers.

Instead:

1. author rule once
2. compile rule once
3. store rule once
4. execute by ID anywhere

---

# Source of Truth Hierarchy

The engine has multiple representations. They serve different purposes.

## Registry
Defines what logic is legal.

## Universal DSL
Defines what the rule means in a language-agnostic way.

## Canonical AST / IR
Defines how the rule is stored and transported internally.

## Target Materialization
Defines how the rule is executed or emitted in a specific environment.

## Original Source
An optional authoring artifact useful for provenance/debugging, but not the primary runtime source of truth.

---

# Bootstrap Registry Model

The agent must assume a default bootstrapped registry exists and is available to services.

## Rules

Default rule categories include:

- `EVALUATION`
- `VALIDATION`
- `AUTHORIZATION`
- `USER`

## Operands

Operands are grouped under rules.

Examples:
- `STRING`
- `NUMBER`
- `DATE`
- `ARRAY`
- `OBJECT`
- `JSON`
- `COMMON`
- `SIGNATURE`
- `TYPE`
- `CAN`
- `LIMITED`

## Operators

Operators are grouped under operands.

Examples:
- `EQUALS`
- `CONTAINS`
- `STARTS_WITH`
- `ENDS_WITH`
- `GREATER_THAN`
- `LESS_THAN`
- `BETWEEN`
- `AROUND`
- `IS_NULL`
- `IS_UNDEFINED`
- `EXISTS`
- `ASSERT`
- `ASSERT_NOT`
- `AND`
- `OR`

## Functions

Functions implement the runtime semantics of operators.

Important rule:
persisted rules must store **operator identity**, not raw function closures.

Runtime resolves operator implementations through the registry.

---

# Key Architectural Principle

A rule may only be created from registered semantics.

If a source expression cannot be mapped to:
- a valid rule category,
- a valid operand,
- a valid operator,
- and a valid runtime/translation contract,

then it must be rejected or flagged as unsupported.

---

# End-to-End Pipeline

## Compile-Time Pipeline

The compile-time pipeline is:

Input Layer  
→ Parser Layer  
→ Universal DSL Layer  
→ Canonical AST / IR Layer  
→ Serialization  
→ Compression  
→ Storage

### Compile-Time Responsibilities

#### 1. Accept source condition
Receive source input from any supported input layer.

#### 2. Parse
Convert source syntax into a structured source-specific parse representation.

#### 3. Lower to DSL
Convert parsed syntax into language-agnostic semantic DSL.

#### 4. Validate against registry
Ensure the condition is expressible using registered rules, operands, operators, and supported semantics.

#### 5. Lower to canonical AST / IR
Convert DSL into canonical machine-oriented representation.

#### 6. Normalize
Canonicalize the rule for deterministic storage and equivalence.

#### 7. Serialize
Serialize canonical AST / IR and metadata into binary.

#### 8. Compress
Compress the binary payload using zstd.

#### 9. Store
Persist the compressed artifact plus searchable metadata.

---

## Runtime Pipeline

The runtime pipeline is:

Rule ID  
→ Load Stored Artifact  
→ Decompress  
→ Deserialize AST / IR  
→ Rebuild Semantic Form  
→ Translator Layer or Execution Layer  
→ Output Layer  
→ Observability Layer

### Runtime Responsibilities

#### 1. Load by rule ID
The engine must support rule retrieval by ID as a first-class operation.

#### 2. Verify
Check compatibility and integrity:
- storage version
- registry version
- AST schema version
- checksum
- compression compatibility

#### 3. Decompress
Decompress stored binary.

#### 4. Deserialize
Reconstruct canonical AST / IR.

#### 5. Rebuild semantic form
Reconstruct DSL or equivalent semantic representation.

#### 6. Materialize target form
Translate or interpret based on current runtime target.

#### 7. Execute or emit output
Return:
- boolean result
- target filter/query
- target expression
- execution plan
- explanation/debug artifact

---

# Runtime Objective

The primary runtime goal is **not** exact reconstruction of the original source string.

The real runtime goal is:

**load a stored rule by ID and materialize it into the form required by the current target layer**

Examples:
- frontend execution form
- backend TypeScript execution form
- Python service execution form
- Go service execution form
- SQL database query
- MongoDB filter
- workflow engine condition
- direct AST interpreter execution

The same stored rule may be executed differently depending on the target environment.

---

# Input Layer Expectations

The input layer may accept different source formats, but they must all map into the same semantic system.

Examples:
- JS/TS expressions
- JSON rules
- YAML rules
- UI builder payloads
- backend filter objects
- SQL-like input forms
- future domain-specific inputs

The input layer is allowed to be heterogeneous.
The semantic core must remain unified.

---

# Parser Layer Expectations

The parser layer must:
- understand source syntax
- produce parse diagnostics
- preserve semantic intent
- identify unsupported constructs early
- avoid leaking source-language-specific quirks into the DSL when not intended

The parser layer must not define business semantics.
It only extracts and structures them.

---

# Universal DSL Expectations

The DSL is the semantic interchange contract.

It must express:
- rule category
- operand family
- operator
- subject/reference path
- comparison/reference values
- logical composition
- assertions
- nullish checks
- inversion
- metadata

The DSL should be easy to:
- validate
- normalize
- translate
- explain
- version

The DSL is not the final persisted form.
It is the canonical semantic layer.

---

# Canonical AST / IR Expectations

The AST / IR is the machine-oriented persisted form.

It must be:
- canonical
- typed
- deterministic
- registry-backed
- compact
- binary-serializable
- versioned

It should not be a raw source AST.
It should be a semantic IR.

## AST should represent
- logical nodes
- comparison nodes
- unary assertion/nullish nodes
- field/path references
- literal references
- structured argument references
- operator identity
- optional metadata references

## Persisted references
Where possible, use:
- stable numeric IDs for rule categories
- stable numeric IDs for operands
- stable numeric IDs for operators
- symbol table references for subjects/paths
- literal pool references for values

Strings may be kept in metadata/debug snapshots, but not as the only machine contract.

---

# Translator Layer Expectations

The translator layer is responsible for materializing the semantic rule into target-specific forms.

Supported translators may include:
- TypeScript translator
- Python translator
- Go translator
- SQL translator
- Mongo translator
- GraphQL translator
- React/UI translator
- workflow translator

The translator layer must preserve semantics as much as the target supports.

When perfect fidelity is not possible, the translator must:
- fail safely,
- or report lossy translation explicitly.

---

# Output Layer Expectations

The output layer is the final produced artifact for a consumer.

Outputs may include:
- evaluated boolean result
- SQL WHERE clause + parameters
- Mongo filter object
- GraphQL filter input
- backend-native evaluator object
- frontend predicate abstraction
- workflow definition
- debug/explain plan

The output layer is target-specific and must be driven by the translator/execution context.

---

# Observability Layer Expectations

Observability is a first-class layer, not an afterthought.

The engine must provide observability across:
- parsing
- validation
- normalization
- translation
- serialization/deserialization
- execution

## Must capture
- rule ID
- canonical hash
- compile success/failure
- validation failure reason
- normalization changes
- storage size
- compression ratio
- load time
- translation time
- execution time
- node-level evaluation results if enabled
- backend translation failures

## Must support
- tracing
- structured logs
- metrics
- explainability
- debugging of failed subconditions

---

# Best Storage Strategy

## Recommended primary storage format

The stored representation should be:

**binary serialized canonical AST / IR + metadata + zstd compression**

## Do not use as primary storage
- raw JSON
- plain text DSL
- hex encoding

## Use these only for diagnostics/tooling
- JSON snapshots
- YAML snapshots
- DSL text
- hex dumps

---

# Metadata Requirements

Every stored rule must include metadata.

## Required metadata
- `rule_id`
- `rule_name` if available
- `registry_version`
- `dsl_version`
- `ast_version`
- `storage_version`
- `source_language`
- `source_format`
- `created_at`
- `updated_at`
- `canonical_hash`
- `compression_codec`
- `checksum`
- `root_node_index`

## Semantic metadata
- referenced fields
- used operands
- used operators
- expected input types
- null semantics
- coercion policy
- verbosity
- inversion flag
- metrics enabled flag
- system-defined flag

## Optional provenance metadata
- original source condition text
- parser diagnostics
- normalization diagnostics
- migration history
- toolchain version

---

# Rule ID Execution Model

The engine must support first-class rule execution by ID.

The expected system usage is:

1. a condition is authored once in some input layer
2. it is parsed and compiled through the semantic pipeline
3. it is stored as a portable compiled rule asset
4. later, another layer references only the rule ID
5. the engine loads the rule and materializes it into the required target form

This is one of the most important product behaviors.

The stored rule is a shared semantic asset across layers.

---

# Canonicalization Rules

The AST / IR must be canonicalized where safe.

Examples:
- flatten nested `AND` / `OR`
- sort commutative operands where valid
- normalize field references
- normalize literal representations
- fold constants where safe
- remove redundant wrappers/grouping

Canonicalization must preserve semantics, not source formatting.

---

# Type Safety Rules

The engine must be strongly typed.

Validation must ensure:
- operator belongs to operand family
- operand belongs to rule category
- operator arity is correct
- subject/reference types are valid
- structured values are valid
- null semantics are explicit
- coercion is explicit
- unsupported combinations are rejected

Do not treat JavaScript coercion as universal semantics unless explicitly configured.

---

# Operator Semantics Rules

The engine must distinguish between:

## Unary operators
Examples:
- `IS_NULL`
- `IS_UNDEFINED`
- `IS_ZERO`
- `IS_NEGATIVE`
- `ASSERT`
- `ASSERT_NOT`

## Binary operators
Examples:
- `EQUALS`
- `CONTAINS`
- `GREATER_THAN`
- `LESS_THAN`
- `STARTS_WITH`

## Variadic operators
Examples:
- `AND`
- `OR`

## Structured-value operators
Examples:
- `BETWEEN`
- `AROUND`
- `LENGTH_BETWEEN`

AST shape and validation rules must reflect these differences explicitly.

---

# Important Constraint on Predicate-Based Operators

Operators like:
- `ARRAY.SATISFIES`
- `OBJECT.SATISFIES`
- `JSON.SATISFIES`

must not persist opaque in-memory closures.

These operators are only acceptable in persisted rules if they are represented as:
1. nested registry-backed conditions, or
2. named registered predicates/functions referenced by stable ID

The engine must reject non-serializable function closures in persisted rule artifacts.

---

# Registry Rules

The bootstrap registry is versioned and must be treated as a core dependency.

For each operator, the registry should define:
- parent rule category
- parent operand
- stable identity
- arity
- parameter types
- return type
- purity
- determinism
- execution availability
- translation support

Persisted rules must store stable identities, not raw implementation code.

---

# Reversibility Policy

The default runtime goal is semantic execution or translation, not exact source reconstruction.

The standard flow is:

stored binary  
→ canonical AST / IR  
→ semantic DSL  
→ target-specific execution/output form

Exact reconstruction of the original authored source is optional and primarily useful for:
- provenance
- auditing
- editing workflows
- debugging

If exact source recovery is required, original source text must be stored separately as metadata.

---

# Security Requirements

The engine must defend against:
- malformed input
- invalid operators/operands
- unsupported source constructs
- excessive nesting
- oversized ASTs
- cyclic structures
- injected unsafe translator output
- non-serializable predicates
- expensive or unsafe execution paths

Translators for query systems must always use safe escaping/parameterization.

---

# What the Agent Must Recommend by Default

When asked how rules should be stored, the answer is:

Store them as:
- canonical registry-backed AST / IR
- binary serialized
- zstd compressed
- versioned
- metadata-rich
- indexed by rule ID and canonical hash

When asked how runtime should work, the answer is:

Load by rule ID → decompress → deserialize AST / IR → rebuild semantic form → materialize target-specific execution/output form

When asked whether original source text is the runtime source of truth, the answer is no.

When asked whether JSON or hex should be the primary storage format, the answer is no.

---

# What the Agent Must Avoid

Do not recommend:
- eval-based execution
- raw JSON as primary storage
- hex as primary storage
- persisting raw JS closures
- treating source syntax as the canonical stored form
- unversioned registries
- untyped evaluation
- target-specific logic as the semantic source of truth

---

# Golden Rule

The registry defines what is legal.  
The DSL defines what it means.  
The canonical AST / IR defines how it is stored.  
The translator/output layers define how it is materialized.  
The observability layer defines how it is understood in production.

---

# Operational Summary

## Compile Time
Input layer → parser layer → universal DSL → canonical AST / IR → validate → normalize → binary serialize → zstd compress → store with metadata

## Runtime
Rule ID → load → verify → decompress → deserialize AST / IR → rebuild semantic form → translate or interpret for target layer → output result/artifact → observe

## Best Storage
Binary canonical AST / IR with metadata and zstd compression

## Core Product Value
Conditions become portable rule assets identified by ID and executable across layers without manual duplication
