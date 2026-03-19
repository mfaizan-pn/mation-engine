/**
 * What: Stress benchmark for compile/store/load/execute pipeline stages.
 * Why: Generates real metrics for each stage at scale.
 * How to use:
 * `node -r ts-node/register src/semantic/benchmarkPipeline.ts`
 * Optional env:
 *   RULE_COUNT, EXECUTIONS, CONDITIONS_PER_RULE, NESTED_DEPTH, SEED
 */
import { performance } from "perf_hooks";
import { createHash } from "crypto";
import { createDefaultSemanticRegistry } from "./registry";
import { createZstdCodec, packCompiledArtifact } from "./codec";
import { UniversalDslParser } from "./parser";
import { UniversalDslValidator } from "./validator";
import { normalizeDsl } from "./normalizer";
import { lowerDslToCanonicalIr } from "./ir";
import {
  InMemoryCompiledRuleStorageAdapter,
  MinioCompiledRuleStorageAdapter,
} from "../integrations";
import { SemanticRuntime } from "./runtime";
import { CompiledRuleArtifact, RuleConditionInput, RuleInput } from "./types";

const RULE_COUNT = Number(process.env.RULE_COUNT ?? "2000");
const EXECUTIONS = Number(process.env.EXECUTIONS ?? "10000");
const CONDITIONS_PER_RULE = Number(process.env.CONDITIONS_PER_RULE ?? "3");
const NESTED_DEPTH = Number(process.env.NESTED_DEPTH ?? "2");
const SEED = Number(process.env.SEED ?? "1337");
const STORAGE_PROVIDER = (
  process.env.RULE_STORAGE_PROVIDER ?? "memory"
).toLowerCase();

const SUBJECTS = {
  STRING: ["candidate.email", "candidate.role", "company.domain"],
  NUMBER: ["candidate.experienceYears", "candidate.age", "company.size"],
  DATE: ["candidate.appliedAt", "company.last_contacted_at"],
  COMMON: ["candidate.resume"],
};

const STRING_REFS = ["aol.com", "admin", "example.com", "@company.com"];
const NUMBER_REFS = [1, 2, 3, 5, 8, 13, 21, 34];
const DATE_REFS = [
  "2025-11-03T08:30:00.000Z",
  "2026-01-15T10:00:00.000Z",
  "2026-03-10T05:30:00.000Z",
];

const OPERATORS = {
  STRING: ["CONTAINS", "ENDS_WITH"],
  NUMBER: ["GREATER_THAN"],
  DATE: ["AFTER", "BEFORE", "EQUALS", "BETWEEN"],
  COMMON: ["EXISTS"],
} as const;

type OperandKey = keyof typeof OPERATORS;

const createRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
};

const pick = <T>(rng: () => number, values: readonly T[]): T =>
  values[Math.floor(rng() * values.length)];

const makeCondition = (rng: () => number): RuleConditionInput => {
  const operand = pick(rng, ["STRING", "NUMBER", "DATE", "COMMON"] as const);
  const operator = pick(rng, OPERATORS[operand]);
  const subject = pick(rng, SUBJECTS[operand]);

  if (operand === "COMMON") {
    return {
      operand,
      operator,
      subject,
    };
  }

  if (operand === "DATE" && operator === "BETWEEN") {
    const start = pick(rng, DATE_REFS);
    const end = pick(rng, DATE_REFS);
    return {
      operand,
      operator,
      subject,
      reference: { start, end },
    };
  }

  if (operand === "STRING") {
    return {
      operand,
      operator,
      subject,
      reference: pick(rng, STRING_REFS),
    };
  }

  if (operand === "DATE") {
    return {
      operand,
      operator,
      subject,
      reference: pick(rng, DATE_REFS),
    };
  }

  return {
    operand,
    operator,
    subject,
    reference: pick(rng, NUMBER_REFS),
  };
};

const makeRuleInput = (rng: () => number, depth: number): RuleInput => {
  if (depth <= 1) {
    return makeCondition(rng);
  }

  const combinator = rng() > 0.5 ? "AND" : "OR";
  const conditions: RuleInput[] = [];
  for (let index = 0; index < CONDITIONS_PER_RULE; index += 1) {
    if (rng() > 0.6) {
      conditions.push(makeRuleInput(rng, depth - 1));
    } else {
      conditions.push(makeCondition(rng));
    }
  }

  return { combinator, conditions };
};

const baseContext = {
  candidate: {
    email: "dev@aol.com",
    role: "admin",
    experienceYears: 6,
    age: 29,
    appliedAt: "2026-03-12T05:30:36.599Z",
    resume: { source: "upload" },
  },
  company: {
    domain: "example.com",
    size: 120,
    last_contacted_at: "2026-03-12T06:30:36.599Z",
  },
};

const hashBuffer = (input: Buffer): string =>
  createHash("sha256").update(input).digest("hex");

type MetricMap = Record<string, number[]>;

const record = (metrics: MetricMap, key: string, valueMs: number): void => {
  if (!metrics[key]) {
    metrics[key] = [];
  }
  metrics[key].push(valueMs);
};

const summarize = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((acc, value) => acc + value, 0);
  const mean = total / values.length;
  const percentile = (p: number) => {
    const index = Math.min(
      sorted.length - 1,
      Math.floor((p / 100) * sorted.length),
    );
    return sorted[index];
  };

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
};

const toMs = (start: number, end: number) => end - start;

const run = async () => {
  const rng = createRng(SEED);
  const registry = createDefaultSemanticRegistry();
  const codec = await createZstdCodec();
  const parser = new UniversalDslParser();
  const validator = new UniversalDslValidator(registry);
  const storage =
    STORAGE_PROVIDER === "minio"
      ? MinioCompiledRuleStorageAdapter.fromEnv()
      : new InMemoryCompiledRuleStorageAdapter();

  const metrics: MetricMap = {};
  const ruleIds: string[] = [];

  for (let index = 0; index < RULE_COUNT; index += 1) {
    const ruleId = `rule-${index}`;
    ruleIds.push(ruleId);

    const input = makeRuleInput(rng, NESTED_DEPTH);

    const tParseStart = performance.now();
    const parsedDsl = parser.parse(ruleId, input, { source_input: input });
    const tParseEnd = performance.now();
    record(metrics, "parse", toMs(tParseStart, tParseEnd));

    const tNormalizeStart = performance.now();
    const normalizedDsl = normalizeDsl(parsedDsl);
    const tNormalizeEnd = performance.now();
    record(metrics, "normalize", toMs(tNormalizeStart, tNormalizeEnd));

    const tValidateStart = performance.now();
    const validation = validator.validate(normalizedDsl);
    const tValidateEnd = performance.now();
    record(metrics, "validate", toMs(tValidateStart, tValidateEnd));

    if (!validation.isValid) {
      throw new Error(
        `Validation failed for ${ruleId}: ${validation.errors.join(" | ")}`,
      );
    }

    const tLowerStart = performance.now();
    const canonicalIr = lowerDslToCanonicalIr(normalizedDsl, registry);
    const tLowerEnd = performance.now();
    record(metrics, "lower", toMs(tLowerStart, tLowerEnd));

    const tSerializeStart = performance.now();
    const serializedIr = Buffer.from(JSON.stringify(canonicalIr), "utf8");
    const tSerializeEnd = performance.now();
    record(metrics, "serialize_ir", toMs(tSerializeStart, tSerializeEnd));

    const tHashCanonicalStart = performance.now();
    const canonicalHash = hashBuffer(serializedIr);
    const tHashCanonicalEnd = performance.now();
    record(
      metrics,
      "hash_canonical",
      toMs(tHashCanonicalStart, tHashCanonicalEnd),
    );

    const tCompressStart = performance.now();
    const compressedPayload = codec.compress(serializedIr);
    const tCompressEnd = performance.now();
    record(metrics, "compress", toMs(tCompressStart, tCompressEnd));

    const tChecksumStart = performance.now();
    const checksum = hashBuffer(compressedPayload);
    const tChecksumEnd = performance.now();
    record(metrics, "hash_checksum", toMs(tChecksumStart, tChecksumEnd));

    const now = new Date().toISOString();
    const artifact: CompiledRuleArtifact = {
      metadata: {
        rule_id: ruleId,
        rule_name: ruleId,
        registry_version: registry.version,
        dsl_version: 1,
        ast_version: canonicalIr.astVersion,
        storage_version: 1,
        source_language: "JSON",
        source_format: "RuleInput",
        created_at: now,
        updated_at: now,
        canonical_hash: canonicalHash,
        compression_codec: codec.codecName,
        checksum,
        root_node_index: canonicalIr.rootNodeIndex,
        referenced_fields: [],
        used_operands: [],
        used_operators: [],
        expected_input_types: [],
        null_semantics: "strict",
        coercion_policy: "none",
        verbosity: "INFO",
        inversion_flag: false,
        metrics_enabled: true,
        system_defined: false,
        semantic_metadata: { source_input: input },
      },
      compressedPayload,
    };

    const tPackStart = performance.now();
    const packed = packCompiledArtifact(artifact);
    const tPackEnd = performance.now();
    record(metrics, "pack", toMs(tPackStart, tPackEnd));

    const tStoreStart = performance.now();
    await storage.saveRuleArtifact(ruleId, packed);
    const tStoreEnd = performance.now();
    record(metrics, "storage_save", toMs(tStoreStart, tStoreEnd));
  }

  for (const ruleId of ruleIds) {
    const tLoadStart = performance.now();
    const packed = await storage.loadRuleArtifact(ruleId);
    const tLoadEnd = performance.now();
    record(metrics, "storage_load", toMs(tLoadStart, tLoadEnd));

    if (!packed) {
      throw new Error(`Missing packed artifact for ${ruleId}`);
    }

    const tUnpackStart = performance.now();
    const metadataLength = packed.readUInt32BE(0);
    const metadataBytes = packed.subarray(4, 4 + metadataLength);
    const payload = packed.subarray(4 + metadataLength);
    const tUnpackEnd = performance.now();
    record(metrics, "unpack", toMs(tUnpackStart, tUnpackEnd));

    const tChecksumVerifyStart = performance.now();
    const checksum = hashBuffer(payload);
    const tChecksumVerifyEnd = performance.now();
    record(
      metrics,
      "verify_checksum",
      toMs(tChecksumVerifyStart, tChecksumVerifyEnd),
    );

    const metadata = JSON.parse(
      metadataBytes.toString("utf8"),
    ) as CompiledRuleArtifact["metadata"];
    if (checksum !== metadata.checksum) {
      throw new Error(`Checksum mismatch for ${ruleId}`);
    }

    const tDecompressStart = performance.now();
    const decompressed = codec.decompress(payload);
    const tDecompressEnd = performance.now();
    record(metrics, "decompress", toMs(tDecompressStart, tDecompressEnd));

    const tHashVerifyStart = performance.now();
    const canonicalHash = hashBuffer(decompressed);
    const tHashVerifyEnd = performance.now();
    record(
      metrics,
      "verify_canonical_hash",
      toMs(tHashVerifyStart, tHashVerifyEnd),
    );

    if (canonicalHash !== metadata.canonical_hash) {
      throw new Error(`Canonical hash mismatch for ${ruleId}`);
    }

    const tDeserializeStart = performance.now();
    JSON.parse(decompressed.toString("utf8"));
    const tDeserializeEnd = performance.now();
    record(metrics, "deserialize_ir", toMs(tDeserializeStart, tDeserializeEnd));
  }

  const runtime = new SemanticRuntime(registry, storage, codec);
  const tPreloadStart = performance.now();
  await runtime.preloadAllArtifacts();
  const tPreloadEnd = performance.now();
  record(metrics, "preload_all", toMs(tPreloadStart, tPreloadEnd));

  for (let index = 0; index < EXECUTIONS; index += 1) {
    const ruleId = ruleIds[Math.floor(rng() * ruleIds.length)];
    const tExecStart = performance.now();
    const result = await runtime.executeById(ruleId, baseContext);
    const tExecEnd = performance.now();
    record(metrics, "execute", toMs(tExecStart, tExecEnd));

    if (!result) {
      throw new Error(`Missing execution result for ${ruleId}`);
    }
  }

  const storedRuleIds = await storage.listRuleIds();
  const summary = Object.fromEntries(
    Object.entries(metrics).map(([key, values]) => [key, summarize(values)]),
  );

  const output = {
    config: {
      ruleCount: RULE_COUNT,
      executions: EXECUTIONS,
      conditionsPerRule: CONDITIONS_PER_RULE,
      nestedDepth: NESTED_DEPTH,
      seed: SEED,
      storageProvider: STORAGE_PROVIDER,
      storedRuleCount: storedRuleIds.length,
    },
    summary,
  };

  console.log(JSON.stringify(output, null, 2));
};

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
