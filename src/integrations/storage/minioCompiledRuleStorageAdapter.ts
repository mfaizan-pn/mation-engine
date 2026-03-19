/**
 * What: MinIO storage adapter for compiled binary rule artifacts + registry state.
 * Why: Supports rule-ID runtime loading with startup-ready semantic assets.
 * How to use:
 * `const storage = MinioCompiledRuleStorageAdapter.fromEnv();`
 */
import { Client } from "minio";
import { CompiledRuleStorageAdapter } from "../../semantic";
import { RegistryExtensionState } from "../../semantic/types";

export interface MinioCompiledStorageConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  rulesPrefix?: string;
  registryStateKey?: string;
}

export class MinioCompiledRuleStorageAdapter
  implements CompiledRuleStorageAdapter
{
  private readonly client: Client;
  private readonly bucket: string;
  private readonly rulesPrefix: string;
  private readonly registryStateKey: string;

  public constructor(config: MinioCompiledStorageConfig) {
    this.client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucket = config.bucket;
    this.rulesPrefix = config.rulesPrefix ?? "compiled-rules";
    this.registryStateKey =
      config.registryStateKey ?? "registry/extensions.json";
  }

  public static fromEnv(): MinioCompiledRuleStorageAdapter {
    const endPoint = process.env.MINIO_ENDPOINT;
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    const bucket = process.env.MINIO_BUCKET;

    if (!endPoint || !accessKey || !secretKey || !bucket) {
      throw new Error(
        "Missing MinIO env vars: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET",
      );
    }

    return new MinioCompiledRuleStorageAdapter({
      endPoint,
      accessKey,
      secretKey,
      bucket,
      port: Number(process.env.MINIO_PORT ?? "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      rulesPrefix: process.env.MINIO_RULE_PREFIX ?? "compiled-rules",
      registryStateKey:
        process.env.MINIO_REGISTRY_STATE_KEY ?? "registry/extensions.json",
    });
  }

  public async saveRuleArtifact(ruleId: string, artifactBinary: Buffer): Promise<void> {
    await this.ensureBucket();
    await this.client.putObject(this.bucket, this.ruleKey(ruleId), artifactBinary);
  }

  public async loadRuleArtifact(ruleId: string): Promise<Buffer | null> {
    await this.ensureBucket();
    try {
      const stream = await this.client.getObject(this.bucket, this.ruleKey(ruleId));
      return await this.streamToBuffer(stream);
    } catch (_error) {
      return null;
    }
  }

  public async listRuleIds(): Promise<ReadonlyArray<string>> {
    await this.ensureBucket();
    const stream = this.client.listObjectsV2(
      this.bucket,
      `${this.rulesPrefix}/`,
      true,
    );

    const ids: string[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (objectInfo) => {
        const objectName = objectInfo.name;
        if (!objectName || !objectName.endsWith(".bin")) {
          return;
        }
        const prefix = `${this.rulesPrefix}/`;
        const withoutPrefix = objectName.startsWith(prefix)
          ? objectName.slice(prefix.length)
          : objectName;
        ids.push(withoutPrefix.replace(/\.bin$/, ""));
      });
      stream.on("error", (error) => reject(error));
      stream.on("end", () => resolve());
    });

    return ids;
  }

  public async deleteRuleArtifact(ruleId: string): Promise<boolean> {
    await this.ensureBucket();
    try {
      await this.client.removeObject(this.bucket, this.ruleKey(ruleId));
      return true;
    } catch (_error) {
      return false;
    }
  }

  public async saveRegistryExtensions(state: RegistryExtensionState): Promise<void> {
    await this.ensureBucket();
    await this.client.putObject(
      this.bucket,
      this.registryStateKey,
      JSON.stringify(state),
    );
  }

  public async loadRegistryExtensions(): Promise<RegistryExtensionState | null> {
    await this.ensureBucket();
    try {
      const stream = await this.client.getObject(this.bucket, this.registryStateKey);
      const buffer = await this.streamToBuffer(stream);
      return JSON.parse(buffer.toString("utf8")) as RegistryExtensionState;
    } catch (_error) {
      return null;
    }
  }

  private ruleKey(ruleId: string): string {
    return `${this.rulesPrefix}/${ruleId}.bin`;
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, "");
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return await new Promise<Buffer>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", (error) => reject(error));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }
}
