/**
 * What: MinIO/S3-compatible storage adapter for rule definitions.
 * Why: Preloads rules at startup and avoids DB round-trips on evaluation path.
 * How to use:
 * `new MinioRuleStorageAdapter({ endPoint, port, useSSL, accessKey, secretKey, bucket })`
 */
import { Client } from "minio";
import { RuleStorageAdapter } from "../../core/contracts";
import { ConditionDefinition } from "../../repositories";

export interface MinioRuleStorageConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  prefix?: string;
}

export class MinioRuleStorageAdapter implements RuleStorageAdapter {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly prefix: string;

  public constructor(config: MinioRuleStorageConfig) {
    this.client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? "rules";
  }

  public static fromEnv(): MinioRuleStorageAdapter {
    const endPoint = process.env.MINIO_ENDPOINT;
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    const bucket = process.env.MINIO_BUCKET;

    if (!endPoint || !accessKey || !secretKey || !bucket) {
      throw new Error(
        "Missing MinIO env vars: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET",
      );
    }

    return new MinioRuleStorageAdapter({
      endPoint,
      accessKey,
      secretKey,
      bucket,
      port: Number(process.env.MINIO_PORT ?? "9000"),
      useSSL: process.env.MINIO_USE_SSL === "true",
      prefix: process.env.MINIO_RULE_PREFIX ?? "rules",
    });
  }

  public async saveRule(rule: ConditionDefinition): Promise<void> {
    await this.ensureBucket();
    const key = this.objectKey(rule.id);
    await this.client.putObject(this.bucket, key, JSON.stringify(rule));
  }

  public async loadRule(id: string): Promise<ConditionDefinition | null> {
    await this.ensureBucket();
    const key = this.objectKey(id);

    try {
      const stream = await this.client.getObject(this.bucket, key);
      const raw = await this.streamToString(stream);
      return JSON.parse(raw) as ConditionDefinition;
    } catch (_error) {
      return null;
    }
  }

  public async listRules(): Promise<ReadonlyArray<ConditionDefinition>> {
    await this.ensureBucket();
    const rules: ConditionDefinition[] = [];
    const stream = this.client.listObjectsV2(
      this.bucket,
      `${this.prefix}/`,
      true,
    );

    await new Promise<void>((resolve, reject) => {
      stream.on("data", async (objectInfo) => {
        if (!objectInfo.name) {
          return;
        }
        try {
          const object = await this.client.getObject(
            this.bucket,
            objectInfo.name,
          );
          const raw = await this.streamToString(object);
          rules.push(JSON.parse(raw) as ConditionDefinition);
        } catch (_error) {
          return;
        }
      });
      stream.on("error", (error) => reject(error));
      stream.on("end", () => resolve());
    });

    return rules;
  }

  public async deleteRule(id: string): Promise<boolean> {
    await this.ensureBucket();
    const key = this.objectKey(id);
    try {
      await this.client.removeObject(this.bucket, key);
      return true;
    } catch (_error) {
      return false;
    }
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, "");
    }
  }

  private objectKey(id: string): string {
    return `${this.prefix}/${id}.json`;
  }

  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    return await new Promise<string>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", (error) => reject(error));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }
}
