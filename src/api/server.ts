/**
 * What: HTTP API server exposing rule registration and execution endpoints.
 * Why: Allows manual testing via Swagger UI/Scalar-compatible OpenAPI.
 * How to use:
 * `pnpm api:dev` then open `http://localhost:3000/docs`.
 */
import Fastify, { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { createEngineAsync, RuleInput, StoredRuleInput } from "../engine";
import {
  FunctionDefinition,
  OperandDefinition,
  OperatorDefinition,
} from "../repositories";
import { RuleOperationNode } from "../types";
import { MinioRuleStorageAdapter } from "../integrations";

const operandBodySchema = {
  type: "object",
  required: ["key", "group"],
  properties: {
    key: { type: "string", example: "TEXT" },
    group: { type: "string", example: "EVALUATION" },
    description: { type: "string", example: "Text-specific operations" },
  },
};

const operatorBodySchema = {
  type: "object",
  required: ["key", "operand", "arity"],
  properties: {
    key: { type: "string", example: "ENDS_WITH" },
    operand: { type: "string", example: "TEXT" },
    arity: { type: "number", example: 2 },
    description: {
      type: "string",
      example: "Checks if string ends with suffix",
    },
  },
};

const functionBodySchema = {
  type: "object",
  required: ["key", "operand", "operator", "preset"],
  properties: {
    key: { type: "string", example: "TEXT:ENDS_WITH" },
    operand: { type: "string", example: "TEXT" },
    operator: { type: "string", example: "ENDS_WITH" },
    preset: {
      type: "string",
      enum: [
        "STRING_CONTAINS",
        "STRING_ENDS_WITH",
        "NUMBER_GREATER_THAN",
        "COMMON_EXISTS",
      ],
      example: "STRING_ENDS_WITH",
    },
  },
};

const registerRuleBodySchema = {
  type: "object",
  required: ["id", "definition"],
  properties: {
    id: { type: "string", example: "candidate-email-domain-check" },
    definition: {
      type: "object",
      example: {
        operand: "TEXT",
        operator: "ENDS_WITH",
        subject: "candidate.email",
        reference: "@company.com",
      },
    },
    metadata: {
      type: "object",
      example: {
        tenantId: "tenant_123",
        module: "screening",
        version: 1,
      },
    },
  },
};

const executeBodySchema = {
  type: "object",
  required: ["input", "context"],
  properties: {
    input: {
      type: "object",
      example: {
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
    },
    context: {
      type: "object",
      example: {
        candidate: {
          email: "dev@aol.com",
          experienceYears: 3,
        },
      },
    },
  },
};

const executeStoredBodySchema = {
  type: "object",
  required: ["context"],
  properties: {
    context: {
      type: "object",
      example: {
        candidate: {
          email: "dev@company.com",
          experienceYears: 6,
        },
      },
    },
  },
};

const okResponseSchema = {
  type: "object",
  required: ["ok"],
  properties: {
    ok: { type: "boolean", default: true },
  },
};

const validationErrorResponseSchema = {
  type: "object",
  required: ["statusCode", "code", "error", "message"],
  properties: {
    statusCode: { type: "number", default: 400 },
    code: { type: "string", default: "FST_ERR_VALIDATION" },
    error: { type: "string", default: "Bad Request" },
    message: {
      type: "string",
      default: "body must have required property 'key'",
    },
  },
};

const notFoundResponseSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string", default: "Rule not found" },
  },
};

const idParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", default: "candidate-email-domain-check" },
  },
};

interface FunctionPresetPayload {
  key: string;
  operand: string;
  operator: string;
  preset:
    | "STRING_CONTAINS"
    | "STRING_ENDS_WITH"
    | "NUMBER_GREATER_THAN"
    | "COMMON_EXISTS";
}

const presetToFunction = (
  payload: FunctionPresetPayload,
): FunctionDefinition => {
  const presetMap: Record<
    FunctionPresetPayload["preset"],
    FunctionDefinition["signature"]
  > = {
    STRING_CONTAINS: (left: unknown, right: unknown) =>
      typeof left === "string" &&
      typeof right === "string" &&
      left.includes(right),
    STRING_ENDS_WITH: (left: unknown, right: unknown) =>
      typeof left === "string" &&
      typeof right === "string" &&
      left.endsWith(right),
    NUMBER_GREATER_THAN: (left: unknown, right: unknown) =>
      typeof left === "number" && typeof right === "number" && left > right,
    COMMON_EXISTS: (value: unknown) => value !== undefined && value !== null,
  };

  return {
    key: payload.key,
    operand: payload.operand,
    operator: payload.operator,
    signature: presetMap[payload.preset],
  };
};

const minioStorageFromEnv = () =>
  process.env.RULE_STORAGE_PROVIDER === "minio"
    ? MinioRuleStorageAdapter.fromEnv()
    : undefined;

export const createRuleApiServer = async (): Promise<FastifyInstance> => {
  const fastify = Fastify({
    logger: true,
    ajv: {
      plugins: [
        (ajv) => {
          ajv.addKeyword("example");
          return ajv;
        },
      ],
    },
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Mation Engine API",
        version: "1.0.0",
      },
    },
  });
  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
  });

  fastify.get("/scalar", async (_req, reply) => {
    reply.type("text/html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mation Engine - Scalar API Reference</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/docs/json"
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
    ></script>
  </body>
</html>`);
  });

  const engine = await createEngineAsync<Record<string, unknown>>({
    freezeAfterInit: false,
    storage: minioStorageFromEnv(),
  });

  fastify.get("/health", async () => ({
    status: "ok",
    rulesLoaded: engine.service.listRules().length,
  }));

  fastify.post<{ Body: OperandDefinition }>(
    "/operands/register",
    {
      schema: {
        tags: ["catalogs"],
        summary: "Register operand",
        body: operandBodySchema,
        response: {
          200: okResponseSchema,
          400: validationErrorResponseSchema,
        },
      },
    },
    async (req) => {
      engine.registerOperand(req.body);
      return { ok: true };
    },
  );

  fastify.post<{ Body: OperatorDefinition }>(
    "/operators/register",
    {
      schema: {
        tags: ["catalogs"],
        summary: "Register operator",
        body: operatorBodySchema,
        response: {
          200: okResponseSchema,
          400: validationErrorResponseSchema,
        },
      },
    },
    async (req) => {
      engine.registerOperator(req.body);
      return { ok: true };
    },
  );

  fastify.post<{ Body: FunctionPresetPayload }>(
    "/functions/register",
    {
      schema: {
        tags: ["catalogs"],
        summary: "Register function",
        body: functionBodySchema,
        response: {
          200: okResponseSchema,
          400: validationErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const definition = presetToFunction(req.body);
      engine.registerFunction(definition);
      return { ok: true };
    },
  );

  fastify.post<{ Body: StoredRuleInput }>(
    "/rules/register",
    {
      schema: {
        tags: ["rules"],
        summary: "Register rule",
        body: registerRuleBodySchema,
        response: {
          200: {
            type: "object",
            required: ["ok", "rule"],
            properties: {
              ok: { type: "boolean", default: true },
              rule: { type: "object" },
            },
          },
          400: validationErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const rule = engine.registerRule(req.body);
      return { ok: true, rule };
    },
  );

  fastify.get("/rules", async () => ({ rules: engine.service.listRules() }));

  fastify.get<{ Params: { id: string } }>(
    "/rules/:id",
    {
      schema: {
        tags: ["rules"],
        summary: "Get rule by id",
        params: idParamsSchema,
        response: {
          200: {
            type: "object",
            required: ["rule"],
            properties: {
              rule: { type: "object" },
            },
          },
          400: validationErrorResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const rule = engine.getRule(req.params.id);
      if (!rule) {
        return reply.code(404).send({ message: "Rule not found" });
      }
      return { rule };
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/rules/:id",
    {
      schema: {
        tags: ["rules"],
        summary: "Delete rule by id",
        params: idParamsSchema,
        response: {
          200: okResponseSchema,
          400: validationErrorResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const removed = engine.removeRule(req.params.id);
      if (!removed) {
        return reply.code(404).send({ message: "Rule not found" });
      }
      return { ok: true };
    },
  );

  fastify.post<{
    Body: { input: RuleInput; context: Record<string, unknown> };
  }>(
    "/rules/execute",
    {
      schema: {
        tags: ["rules"],
        summary: "Execute inline rule input",
        body: executeBodySchema,
        response: {
          200: {
            type: "object",
            required: ["output"],
            properties: {
              output: { type: "object" },
            },
          },
          400: validationErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const output = engine.service.execute(req.body.input, req.body.context);
      return { output };
    },
  );

  fastify.post<{
    Params: { id: string };
    Body: { context: Record<string, unknown> };
  }>(
    "/rules/:id/execute",
    {
      schema: {
        tags: ["rules"],
        summary: "Execute stored rule by id",
        params: idParamsSchema,
        body: executeStoredBodySchema,
        response: {
          200: {
            type: "object",
            required: ["output"],
            properties: {
              output: { type: "object" },
            },
          },
          400: validationErrorResponseSchema,
          404: notFoundResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const rule = engine.getRule(req.params.id);
      if (!rule) {
        return reply.code(404).send({ message: "Rule not found" });
      }
      const output = engine.service.evaluate(
        rule.ast as RuleOperationNode,
        req.body.context,
      );
      return { output };
    },
  );

  return fastify;
};

if (require.main === module) {
  createRuleApiServer()
    .then((server) =>
      server.listen({
        host: "0.0.0.0",
        port: Number(process.env.PORT ?? "3000"),
      }),
    )
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
