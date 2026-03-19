# Performance Summary

This is a concise readout of the benchmark in `docs/performance-metrics.md`.

## In-Memory Highlights (ms)

- Compile-time dominant stages: `compress` (~0.019 mean), `serialize_ir` (~0.0046 mean), `normalize` (~0.0084 mean).
- Storage roundtrip: `pack` (~0.0053 mean), `storage_save` (~0.0022 mean), `storage_load` (~0.0017 mean), `unpack` (~0.0005 mean).
- Decode path: `decompress` (~0.0101 mean), `deserialize_ir` (~0.0035 mean), hash checks ~0.0011–0.0014 mean.
- Preload all rules (2000): ~37.97 ms total in-memory.
- Execution after preload: ~0.00553 ms mean, ~0.01178 ms p99.

## MinIO Highlights (ms)

- Compile-time dominant stages: `compress` (~0.145 mean), `serialize_ir` (~0.0298 mean), `normalize` (~0.0430 mean).
- Storage roundtrip: `pack` (~0.0371 mean), `storage_save` (~3.88 mean), `storage_load` (~2.04 mean), `unpack` (~0.00483 mean).
- Decode path: `decompress` (~0.0757 mean), `deserialize_ir` (~0.0214 mean), hash checks ~0.006–0.010 mean.
- Preload all rules (2000): ~3612.25 ms total with MinIO.
- Execution after preload: ~0.00588 ms mean, ~0.01894 ms p99.

## Interpretation

- Preload removes storage latency from execution in both modes; execution cost is primarily IR traversal and operator runtime.
- MinIO adds significant load-time latency, which is expected for networked storage and object retrieval.
- Compression is the heaviest compile-time cost in both configurations.
