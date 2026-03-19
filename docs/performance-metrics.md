# Performance Metrics (Stress Benchmark)

This document reports **real measurements** produced by `src/semantic/benchmarkPipeline.ts` on this machine.

## Environment

- Shell: zsh
- Runtime: `node -r ts-node/register`

## Benchmark Configuration (common)

- Rule count: 2000
- Executions: 10000
- Conditions per rule: 3
- Nested depth: 2
- Seed: 1337

## In-Memory Storage Run

- Date: 2026-03-18
- Storage: `InMemoryCompiledRuleStorageAdapter`

### Stage Metrics (milliseconds)

| Stage | Count | Mean | P50 | P95 | P99 | Min | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| parse | 2000 | 0.000503 | 0.000223 | 0.000859 | 0.001982 | 0.000107 | 0.066083 |
| normalize | 2000 | 0.008416 | 0.005572 | 0.007639 | 0.014692 | 0.002424 | 4.421600 |
| validate | 2000 | 0.000945 | 0.000675 | 0.001515 | 0.002785 | 0.000353 | 0.085487 |
| lower | 2000 | 0.003435 | 0.001362 | 0.003262 | 0.006658 | 0.000733 | 1.546445 |
| serialize_ir | 2000 | 0.004606 | 0.003716 | 0.005956 | 0.010006 | 0.002571 | 1.055295 |
| hash_canonical | 2000 | 0.001560 | 0.001312 | 0.002074 | 0.004101 | 0.000804 | 0.080838 |
| compress | 2000 | 0.019119 | 0.015682 | 0.028076 | 0.067828 | 0.011306 | 2.082970 |
| hash_checksum | 2000 | 0.001410 | 0.001369 | 0.001954 | 0.004053 | 0.000736 | 0.022976 |
| pack | 2000 | 0.005273 | 0.004715 | 0.006491 | 0.013407 | 0.003356 | 0.199967 |
| storage_save | 2000 | 0.002205 | 0.001764 | 0.004214 | 0.008448 | 0.001150 | 0.113952 |
| storage_load | 2000 | 0.001736 | 0.001469 | 0.002856 | 0.005042 | 0.001241 | 0.066689 |
| unpack | 2000 | 0.000511 | 0.000460 | 0.000601 | 0.001181 | 0.000277 | 0.033286 |
| verify_checksum | 2000 | 0.001076 | 0.000932 | 0.001258 | 0.002243 | 0.000693 | 0.138874 |
| decompress | 2000 | 0.010088 | 0.007628 | 0.010803 | 0.025061 | 0.006555 | 1.876236 |
| verify_canonical_hash | 2000 | 0.001092 | 0.001024 | 0.001363 | 0.002248 | 0.000823 | 0.006861 |
| deserialize_ir | 2000 | 0.003521 | 0.003454 | 0.003958 | 0.005280 | 0.002457 | 0.026022 |
| preload_all | 1 | 37.966746 | 37.966746 | 37.966746 | 37.966746 | 37.966746 | 37.966746 |
| execute | 10000 | 0.005530 | 0.004064 | 0.006617 | 0.011784 | 0.002329 | 4.430924 |

## MinIO Storage Run

- Date: 2026-03-19
- Storage: `MinioCompiledRuleStorageAdapter`
- Storage provider: `minio`

### Stage Metrics (milliseconds)

| Stage | Count | Mean | P50 | P95 | P99 | Min | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| parse | 2000 | 0.004762 | 0.003941 | 0.011645 | 0.015684 | 0.000732 | 0.080694 |
| normalize | 2000 | 0.042978 | 0.037893 | 0.078298 | 0.099973 | 0.006445 | 4.791049 |
| validate | 2000 | 0.008700 | 0.007697 | 0.018982 | 0.026211 | 0.001323 | 0.102368 |
| lower | 2000 | 0.014876 | 0.013251 | 0.032517 | 0.051552 | 0.002146 | 0.266710 |
| serialize_ir | 2000 | 0.029765 | 0.027917 | 0.059114 | 0.074451 | 0.006174 | 0.193515 |
| hash_canonical | 2000 | 0.016237 | 0.014504 | 0.034978 | 0.052082 | 0.002347 | 0.139956 |
| compress | 2000 | 0.144885 | 0.135495 | 0.273069 | 0.337491 | 0.027821 | 2.983879 |
| hash_checksum | 2000 | 0.008545 | 0.007430 | 0.018676 | 0.032998 | 0.001344 | 0.128935 |
| pack | 2000 | 0.037071 | 0.035127 | 0.071855 | 0.095349 | 0.007356 | 0.196595 |
| storage_save | 2000 | 3.880886 | 3.671015 | 7.157637 | 8.974563 | 1.104641 | 16.080770 |
| storage_load | 2000 | 2.035968 | 1.620436 | 4.540441 | 5.738314 | 0.515353 | 11.559197 |
| unpack | 2000 | 0.004828 | 0.003680 | 0.010243 | 0.014903 | 0.001116 | 0.071406 |
| verify_checksum | 2000 | 0.010087 | 0.007797 | 0.026456 | 0.034999 | 0.001649 | 0.084623 |
| decompress | 2000 | 0.075698 | 0.058721 | 0.165511 | 0.221146 | 0.018459 | 1.934616 |
| verify_canonical_hash | 2000 | 0.006029 | 0.004677 | 0.014042 | 0.021148 | 0.001229 | 0.050622 |
| deserialize_ir | 2000 | 0.021438 | 0.016752 | 0.046616 | 0.064327 | 0.005004 | 0.162943 |
| preload_all | 1 | 3612.253640 | 3612.253640 | 3612.253640 | 3612.253640 | 3612.253640 | 3612.253640 |
| execute | 10000 | 0.005876 | 0.004192 | 0.011734 | 0.018943 | 0.002563 | 2.376919 |

## Notes

- `preload_all` includes reading all rules from storage, unpacking, and decoding into memory caches.
- `execute` is measured after preloading, so it reflects “in-memory to execution” timing.
- Storage metrics differ dramatically between `memory` and `minio` because MinIO includes network and object-store I/O.

## Reproduce

```bash
node -r ts-node/register src/semantic/benchmarkPipeline.ts
```

```bash
RULE_STORAGE_PROVIDER=minio node -r ts-node/register src/semantic/benchmarkPipeline.ts
```

Optional overrides:

```bash
RULE_COUNT=5000 EXECUTIONS=20000 CONDITIONS_PER_RULE=4 NESTED_DEPTH=3 SEED=42 \
  RULE_STORAGE_PROVIDER=minio node -r ts-node/register src/semantic/benchmarkPipeline.ts
```
