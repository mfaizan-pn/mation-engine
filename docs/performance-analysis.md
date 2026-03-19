# Performance Analysis

This document analyzes the most recent benchmark metrics and states whether the current system performance is acceptable.

## What rules were stored

The benchmark generates **synthetic but valid** rules from the default registry. It uses these operand/operator families:

- `STRING`: `CONTAINS`, `ENDS_WITH`
- `NUMBER`: `GREATER_THAN`
- `DATE`: `AFTER`, `BEFORE`, `EQUALS`, `BETWEEN`
- `COMMON`: `EXISTS`

Subjects are chosen from a small, realistic field set:

- `candidate.email`, `candidate.role`, `company.domain`
- `candidate.experienceYears`, `candidate.age`, `company.size`
- `candidate.appliedAt`, `company.last_contacted_at`
- `candidate.resume`

Each rule is a mix of conditions combined by nested `AND`/`OR` groups (depth 2 by default). The rules are randomized but deterministic via a fixed seed. See `src/semantic/benchmarkPipeline.ts:27` for the generator.

## Benchmarks used in this analysis

- In-memory run (2000 rules, 10000 executions) from `docs/performance-metrics.md`.
- MinIO run (2000 rules, 10000 executions) from your latest output (storageProvider=`minio`, storedRuleCount=2001).

The extra stored rule indicates a prior run or a previously saved rule in the same prefix. This does not invalidate the benchmark, but it means preload includes more than the generated 2000 rules.

## Key observations (MinIO)

- **Storage save/load are the dominant costs**:
  - `storage_save` mean ~4.55 ms per rule, `storage_load` mean ~1.22 ms.
  - This is expected for networked object storage and is in line with S3-compatible systems on local networks.
- **Preload is the main one-time hit**:
  - `preload_all` ~2777 ms for ~2000 rules (~1.4 ms per rule average including decode).
  - This is acceptable if you want near-zero execution latency afterward.
- **Execution is fast once preloaded**:
  - `execute` mean ~0.0052 ms and p99 ~0.0127 ms.
  - This indicates the in-memory IR evaluation path is efficient.
- **Compression/serialization remain non-trivial**:
  - `compress` mean ~0.141 ms, `serialize_ir` mean ~0.029 ms.
  - These are compile-time costs and do not affect runtime latency once rules are stored.

## Comparison to in-memory storage

- In-memory storage gives lower compile-time and load-time latency as expected.
- Execution latency is similar between in-memory and MinIO runs because runtime uses preloaded caches.
- The dominant differences are in I/O-bound stages (`storage_save`, `storage_load`, `preload_all`).

## Is the current state good?

**Yes, for the stated goal** of zero-latency execution with preloaded rules.

- If your product requires **interactive rule evaluation**, the execution metrics are strong.
- If you need **fast cold-starts**, preload is a tradeoff: it adds a one-time cost but keeps runtime latency stable.
- If you expect **very large rule sets**, preload time will grow linearly; you may want tiered loading, sharding, or partial preload by tenant.

## Suggested thresholds (pragmatic)

- **Execution (p99)**: < 0.05 ms per rule is excellent; current ~0.013 ms is well within this.
- **Preload time**: < 5 seconds for ~2000 rules is reasonable; current ~2.8 seconds is good.
- **Storage save/load**: 1–10 ms per rule is common on local S3-compatible systems; current values are in range.

## Conclusion

The system is performing well for a preloaded, rule-ID execution model. The largest cost is expected and isolated to storage and preload stages. Runtime execution latency is excellent and consistent with the goal of “no delay at execution time.”
