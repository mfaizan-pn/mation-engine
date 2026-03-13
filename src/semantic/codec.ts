/**
 * What: Binary serialization + zstd compression helpers for canonical IR.
 * Why: Implements primary storage format required by architecture.
 * How to use:
 * `const codec = await createZstdCodec();`
 */
import { createHash } from "crypto";
import {
  CanonicalAstIr,
  CompiledRuleArtifact,
  CompiledRuleMetadata,
} from "./types";

const { ZstdCodec } = require("zstd-codec") as { ZstdCodec: any };

export interface CompressionCodec {
  codecName: "zstd";
  compress(input: Buffer): Buffer;
  decompress(input: Buffer): Buffer;
}

const createChecksum = (input: Buffer): string =>
  createHash("sha256").update(input).digest("hex");

const createCanonicalHash = (input: Buffer): string => createChecksum(input);

const toMetadataBytes = (metadata: CompiledRuleMetadata): Buffer =>
  Buffer.from(JSON.stringify(metadata), "utf8");

const readMetadataBytes = (buffer: Buffer): CompiledRuleMetadata =>
  JSON.parse(buffer.toString("utf8")) as CompiledRuleMetadata;

const serializeCanonicalIr = (ir: CanonicalAstIr): Buffer =>
  Buffer.from(JSON.stringify(ir), "utf8");

const deserializeCanonicalIr = (buffer: Buffer): CanonicalAstIr =>
  JSON.parse(buffer.toString("utf8")) as CanonicalAstIr;

export const packCompiledArtifact = (
  artifact: CompiledRuleArtifact,
): Buffer => {
  const metadataBytes = toMetadataBytes(artifact.metadata);
  const metadataLength = Buffer.alloc(4);
  metadataLength.writeUInt32BE(metadataBytes.length, 0);
  return Buffer.concat([
    metadataLength,
    metadataBytes,
    artifact.compressedPayload,
  ]);
};

export const unpackCompiledArtifact = (
  buffer: Buffer,
): CompiledRuleArtifact => {
  const metadataLength = buffer.readUInt32BE(0);
  const metadataBytes = buffer.subarray(4, 4 + metadataLength);
  const payload = buffer.subarray(4 + metadataLength);

  return {
    metadata: readMetadataBytes(metadataBytes),
    compressedPayload: payload,
  };
};

export const createZstdCodec = async (): Promise<CompressionCodec> => {
  const simple = await new Promise<any>((resolve) => {
    ZstdCodec.run((zstd: any) => resolve(new zstd.Simple()));
  });

  return {
    codecName: "zstd",
    compress(input: Buffer): Buffer {
      return Buffer.from(simple.compress(input));
    },
    decompress(input: Buffer): Buffer {
      return Buffer.from(simple.decompress(input));
    },
  };
};

export const buildCompiledArtifact = (
  metadata: Omit<
    CompiledRuleMetadata,
    "canonical_hash" | "checksum" | "compression_codec"
  >,
  canonicalIr: CanonicalAstIr,
  codec: CompressionCodec,
): CompiledRuleArtifact => {
  const serializedIr = serializeCanonicalIr(canonicalIr);
  const compressedPayload = codec.compress(serializedIr);

  return {
    metadata: {
      ...metadata,
      canonical_hash: createCanonicalHash(serializedIr),
      checksum: createChecksum(compressedPayload),
      compression_codec: codec.codecName,
    },
    compressedPayload,
  };
};

export const decodeCompiledIr = (
  artifact: CompiledRuleArtifact,
  codec: CompressionCodec,
): CanonicalAstIr => {
  const checksum = createChecksum(artifact.compressedPayload);
  if (checksum !== artifact.metadata.checksum) {
    throw new Error(
      `Checksum mismatch for rule ${artifact.metadata.rule_id}. Artifact may be corrupted.`,
    );
  }

  const serialized = codec.decompress(artifact.compressedPayload);
  const canonicalHash = createCanonicalHash(serialized);
  if (canonicalHash !== artifact.metadata.canonical_hash) {
    throw new Error(
      `Canonical hash mismatch for rule ${artifact.metadata.rule_id}.`,
    );
  }

  return deserializeCanonicalIr(serialized);
};
