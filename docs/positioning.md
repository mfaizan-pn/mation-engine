# Positioning and Truth Statement

## What problem we solve

Most systems duplicate conditional logic across frontend, backend, and data layers. That duplication causes drift, inconsistent behavior, and slow iteration. This engine makes a condition a **portable compiled asset** that can be stored once, referenced by ID, and executed or translated consistently across environments.

This is only one part of a broader ecosystem we are building: **trigger → condition → action**. The full problem is that today, even when teams build automations, each layer re-implements the same logic and coordination:

- **Triggers** (the when) are often hardcoded in one place.
- **Conditions** (the if) are re-authored multiple times across services.
- **Actions** (the then) are implemented separately and tied to one runtime.
- **Builders/APIs** are inconsistent, so users cannot define behavior once and reuse it everywhere.

The result is fragmented automation where behavior is not portable, not auditable, and not reusable across products, services, and runtimes. Our engine is the **semantic core** that solves the conditional part of that chain with deterministic, registry-backed rules that can be compiled once and executed anywhere. The larger ecosystem connects that core to triggers and actions, giving users a single way to define behavior that is consistent across the entire system.

## What makes this approach different

- **Registry-backed semantics**: Only registered operands/operators are valid. This creates a closed-world, auditable rule system, not ad-hoc evaluation.
- **Canonical IR as the source of truth**: The stored asset is a deterministic IR, not the original source string. That makes rules stable, hashable, and portable.
- **Compile once, execute anywhere**: Rules are compiled into a canonical format and reused across targets without re-authoring.
- **Translation-first architecture**: The engine explicitly separates parsing, normalization, IR lowering, and target translation, which keeps semantics consistent.
- **Deterministic normalization**: Equivalent logical structures are canonicalized so they hash and compare identically.

## How others typically solve this

- **Ad-hoc evaluation**: Many systems keep raw expressions and `eval` at runtime. This is flexible but unsafe, hard to audit, and not portable.
- **JSON rule engines**: These often store a JSON AST as the source of truth. They are easy to use but typically lack a strict registry model, stable IDs, and cross-target translation semantics.
- **Workflow engines**: Usually focus on execution within a single platform; they rarely provide a portable, canonical rule asset usable across frontend/backend/query layers.
- **Policy-as-code (OPA/Rego, Cedar, etc.)**: These are strong for authorization but are not designed as a universal, multi-target conditional logic compiler with portable IR and registry-defined semantics.

## Why ours is better for this use case

- **Consistency across layers**: One compiled rule drives multiple runtime targets with the same semantics.
- **Portability by design**: The canonical IR is explicitly designed for translation and execution across runtimes.
- **Deterministic storage**: Canonicalization + hashing prevents drift and enables deduplication.
- **Observability-ready**: The pipeline stages and metadata make performance and correctness diagnosable.

## What we are building (ecosystem view)

The engine is only the **core**. The larger ecosystem includes:
- **Triggers**: the when
- **Conditions**: the if (this engine)
- **Actions**: the then
- **User-facing builders and APIs** that compile to the same registry-backed semantic core

The goal is to let users define behavior once, and have it execute consistently everywhere the business runs.
