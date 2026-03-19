/**
 * What: High-level semantic engine facade for compile/store/load/execute by rule ID.
 * Why: Encapsulates AGENTS-aligned compile-time and runtime pipelines.
 * How to use:
 * `const engine = await createSemanticEngine({ storage });`
 */
import { createZstdCodec } from "./codec";
import { SemanticRuleCompiler } from "./compiler";
import { createDefaultSemanticRegistry } from "./registry";
import { SemanticRuntime } from "./runtime";
import { CompiledRuleStorageAdapter } from "./storage";
import {
  CompiledRuleMetadata,
  RegistryExtensionState,
  RuleInput,
} from "./types";

export interface SemanticEngine {
  compileAndStore(
    ruleId: string,
    input: RuleInput,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
  executeById(
    ruleId: string,
    context: Record<string, unknown>,
  ): Promise<{
    result: boolean;
    trace: Array<{ nodeIndex: number; operatorId: number; outcome: boolean }>;
    metadata: CompiledRuleMetadata;
  } | null>;
  registerOperand(input: {
    key: string;
    group: "EVALUATION" | "VALIDATION" | "AUTHORIZATION" | "USER";
    description?: string;
  }): Promise<void>;
  registerOperator(input: {
    key: string;
    operand: string;
    arity: number;
    description?: string;
  }): Promise<void>;
  registerFunctionPreset(input: {
    key: string;
    operand: string;
    operator: string;
    preset:
      | "STRING_CONTAINS"
      | "STRING_ENDS_WITH"
      | "NUMBER_GREATER_THAN"
      | "DATE_AFTER"
      | "DATE_BEFORE"
      | "DATE_EQUALS"
      | "DATE_BETWEEN"
      | "COMMON_EXISTS";
  }): Promise<void>;
  listOperands(): Promise<
    ReadonlyArray<{
      key: string;
      group: "EVALUATION" | "VALIDATION" | "AUTHORIZATION" | "USER";
      description?: string;
    }>
  >;
  listOperators(input?: { operand?: string }): Promise<
    ReadonlyArray<{
      key: string;
      operand: string;
      arity: "UNARY" | "BINARY" | "VARIADIC" | "STRUCTURED";
      description?: string;
    }>
  >;
  listRuleIds(): Promise<ReadonlyArray<string>>;
  getRuleMetadata(ruleId: string): Promise<CompiledRuleMetadata | null>;
  deleteRule(ruleId: string): Promise<boolean>;
}

export const createSemanticEngine = async (config: {
  storage: CompiledRuleStorageAdapter;
}): Promise<SemanticEngine> => {
  const codec = await createZstdCodec();
  const registry = createDefaultSemanticRegistry();
  const runtime = new SemanticRuntime(registry, config.storage, codec);
  await runtime.hydrateRegistryExtensions();
  await runtime.preloadAllArtifacts();
  const compiler = new SemanticRuleCompiler(registry, codec);

  const persistRegistry = async (): Promise<void> => {
    const extensions: RegistryExtensionState = registry.getSnapshot();
    await runtime.persistRegistryExtensions(extensions);
  };

  return {
    async compileAndStore(
      ruleId: string,
      input: RuleInput,
      metadata?: Record<string, unknown>,
    ) {
      const artifact = compiler.compile({ ruleId, input, metadata });
      await runtime.saveCompiledRuleArtifact(ruleId, artifact);
    },
    async executeById(ruleId: string, context: Record<string, unknown>) {
      const output = await runtime.executeById(ruleId, context);
      return output
        ? {
            result: output.result,
            trace: output.trace,
            metadata: output.metadata,
          }
        : null;
    },
    async registerOperand(input) {
      registry.registerOperand(input);
      await persistRegistry();
    },
    async registerOperator(input) {
      registry.registerOperator(input);
      await persistRegistry();
    },
    async registerFunctionPreset(input) {
      registry.registerFunctionPreset(input);
      await persistRegistry();
    },
    async listOperands() {
      return registry.listOperands().map((operand) => ({
        key: operand.key,
        group:
          registry.getRuleCategoryById(operand.ruleCategoryId)?.key ??
          "EVALUATION",
        description: operand.description,
      }));
    },
    async listOperators(input) {
      return registry.listOperators(input?.operand).map((operator) => ({
        key: operator.key,
        operand: operator.operandKey,
        arity: operator.arity,
        description: operator.description,
      }));
    },
    async listRuleIds() {
      return await runtime.listRuleIds();
    },
    async getRuleMetadata(ruleId: string) {
      return (await runtime.getMetadata(ruleId)) ?? null;
    },
    async deleteRule(ruleId: string) {
      return await runtime.deleteRule(ruleId);
    },
  };
};
