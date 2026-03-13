/**
 * What: CLI script to print every semantic pipeline stage for a rule.
 * Why: Lets you inspect exact compile artifacts end-to-end in terminal.
 * How to use:
 * `node -r ts-node/register src/semantic/showPipelineStages.ts`
 * `node -r ts-node/register src/semantic/showPipelineStages.ts ./rule-input.json`
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createDefaultSemanticRegistry } from "./registry";
import { createZstdCodec } from "./codec";
import { RuleInput } from "./types";
import { buildPipelineSnapshot } from "./pipelineSnapshot";

interface PipelineInputEnvelope {
  ruleId: string;
  input: RuleInput;
  metadata?: Record<string, unknown>;
}

const defaultEnvelope: PipelineInputEnvelope = {
  ruleId: "candidate-screening-rule",
  input: {
    combinator: "OR",
    conditions: [
      {
        combinator: "AND",
        conditions: [
          {
            operand: "STRING",
            operator: "CONTAINS",
            subject: "candidate.email",
            reference: "aol.com",
          },
          {
            operand: "NUMBER",
            operator: "GREATER_THAN",
            subject: "candidate.experienceYears",
            reference: 2,
          },
        ],
      },
      {
        operand: "NUMBER",
        operator: "GREATER_THAN",
        subject: "candidate.experienceYears",
        reference: 5,
      },
    ],
  },
  metadata: {
    tenantId: "tenant_123",
    module: "screening",
    version: 1,
  },
};

const printJson = (title: string, value: unknown): void => {
  console.log(`\n===== ${title} =====`);
  console.log(JSON.stringify(value, null, 2));
};

const looksLikeEnvelope = (
  value: unknown,
): value is Partial<PipelineInputEnvelope> & { input: unknown } =>
  typeof value === "object" &&
  value !== null &&
  "input" in value &&
  "ruleId" in value;

const parseFileInput = (filePath: string): PipelineInputEnvelope => {
  const absolutePath = resolve(filePath);
  const parsed = JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;

  if (looksLikeEnvelope(parsed)) {
    return {
      ruleId:
        typeof parsed.ruleId === "string" && parsed.ruleId.length > 0
          ? parsed.ruleId
          : defaultEnvelope.ruleId,
      input: parsed.input as RuleInput,
      metadata:
        typeof parsed.metadata === "object" && parsed.metadata !== null
          ? (parsed.metadata as Record<string, unknown>)
          : undefined,
    };
  }

  return {
    ruleId: defaultEnvelope.ruleId,
    input: parsed as RuleInput,
    metadata: defaultEnvelope.metadata,
  };
};

const run = async (): Promise<void> => {
  const inputPath = process.argv[2];
  const envelope = inputPath ? parseFileInput(inputPath) : defaultEnvelope;

  const registry = createDefaultSemanticRegistry();
  const codec = await createZstdCodec();
  const snapshot = await buildPipelineSnapshot({
    registry,
    codec,
    ruleId: envelope.ruleId,
    input: envelope.input,
    metadata: envelope.metadata,
  });

  printJson("1) SOURCE INPUT (RuleInput)", envelope);
  printJson("2) PARSED UNIVERSAL DSL", snapshot.parsedDsl);
  printJson("3) NORMALIZED DSL", snapshot.normalizedDsl);
  printJson("4) VALIDATION RESULT", snapshot.validation);
  if (!snapshot.validation.isValid) {
    process.exitCode = 1;
    return;
  }
  printJson("5) CANONICAL AST / IR", snapshot.canonicalIr);
  printJson("6) COMPILED METADATA", snapshot.artifact?.metadata);
  printJson("6b) COMPRESSED PAYLOAD STATS", {
    compression_codec: snapshot.artifact?.metadata.compression_codec,
    compressed_payload_bytes:
      snapshot.packedBinaryStats?.compressedPayloadBytes,
  });
  printJson("7) BINARY STORAGE ENVELOPE", {
    total_bytes: snapshot.packedBinaryStats?.totalBytes,
    first_24_bytes_hex: snapshot.packedBinaryStats?.first24BytesHex,
  });
  printJson("8) DECODED IR (after storage roundtrip)", snapshot.decodedIr);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
