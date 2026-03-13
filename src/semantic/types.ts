/**
 * What: Core semantic types for registry, DSL, canonical IR, and compiled assets.
 * Why: Keeps compile/runtime contracts explicit, versioned, and portable.
 * How to use:
 * `import { UniversalDslNode, CompiledRuleMetadata } from "../semantic";`
 */
export type RuleCategoryKey =
  | "EVALUATION"
  | "VALIDATION"
  | "AUTHORIZATION"
  | "USER";

export interface RuleConditionInput {
  operand: string;
  operator: string;
  subject: string | unknown;
  reference?: unknown;
  subjectType?: "variable" | "literal";
  referenceType?: "variable" | "literal";
}

export interface RuleGroupInput {
  combinator: "AND" | "OR";
  conditions: RuleInput[];
}

export type RuleInput = RuleConditionInput | RuleGroupInput;

export interface RuleCategoryDefinition {
  id: number;
  key: RuleCategoryKey;
}

export interface OperandDefinition {
  id: number;
  key: string;
  ruleCategoryId: number;
  description?: string;
}

export type OperatorArity = "UNARY" | "BINARY" | "VARIADIC" | "STRUCTURED";

export interface OperatorDefinition {
  id: number;
  key: string;
  operandId: number;
  arity: OperatorArity;
  parameterTypes: ReadonlyArray<string>;
  returnType: "boolean";
  pure: boolean;
  deterministic: boolean;
  translationSupport: ReadonlyArray<string>;
  description?: string;
}

export type RuntimeFunctionImplementation = (
  ...args: ReadonlyArray<unknown>
) => boolean;

export interface FunctionDefinition {
  operatorId: number;
  stableId: string;
  implementation: RuntimeFunctionImplementation;
  preset?: string;
}

export type UniversalValueRef =
  | { type: "path"; value: string }
  | { type: "literal"; value: unknown };

export interface UniversalDslComparisonNode {
  nodeType: "comparison";
  operandKey: string;
  operatorKey: string;
  subject: UniversalValueRef;
  reference?: UniversalValueRef;
}

export interface UniversalDslLogicalNode {
  nodeType: "logical";
  operatorKey: "AND" | "OR";
  children: UniversalDslNode[];
}

export type UniversalDslNode =
  | UniversalDslComparisonNode
  | UniversalDslLogicalNode;

export interface UniversalDslRule {
  ruleId: string;
  root: UniversalDslNode;
  metadata?: Record<string, unknown>;
  inversionFlag?: boolean;
}

export interface CanonicalValueRef {
  kind: "symbol" | "literal";
  index: number;
}

export interface CanonicalLogicalNode {
  kind: "logical";
  operatorId: number;
  childNodeIndexes: number[];
}

export interface CanonicalComparisonNode {
  kind: "comparison";
  ruleCategoryId: number;
  operandId: number;
  operatorId: number;
  subjectRef: CanonicalValueRef;
  referenceRef?: CanonicalValueRef;
}

export type CanonicalNode = CanonicalLogicalNode | CanonicalComparisonNode;

export interface CanonicalAstIr {
  astVersion: number;
  symbolTable: string[];
  literalPool: unknown[];
  nodes: CanonicalNode[];
  rootNodeIndex: number;
}

export interface CompiledRuleMetadata {
  rule_id: string;
  rule_name?: string;
  registry_version: string;
  dsl_version: number;
  ast_version: number;
  storage_version: number;
  source_language: string;
  source_format: string;
  created_at: string;
  updated_at: string;
  canonical_hash: string;
  compression_codec: "zstd";
  checksum: string;
  root_node_index: number;
  referenced_fields: string[];
  used_operands: string[];
  used_operators: string[];
  expected_input_types: string[];
  null_semantics: "strict";
  coercion_policy: "none";
  verbosity: "INFO" | "DEBUG" | "TRACE";
  inversion_flag: boolean;
  metrics_enabled: boolean;
  system_defined: boolean;
  semantic_metadata?: Record<string, unknown>;
}

export interface CompiledRuleArtifact {
  metadata: CompiledRuleMetadata;
  compressedPayload: Buffer;
}

export interface CompiledRuleEnvelope {
  metadata: CompiledRuleMetadata;
  compressedPayloadBase64: string;
}

export interface RegistryExtensionState {
  version: string;
  operands: Array<{
    key: string;
    group: RuleCategoryKey;
    description?: string;
  }>;
  operators: Array<{
    key: string;
    operand: string;
    arity: number;
    description?: string;
  }>;
  functionPresets: Array<{
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
  }>;
}

export interface CompileRequest {
  ruleId: string;
  input: RuleInput;
  metadata?: Record<string, unknown>;
  sourceLanguage?: string;
  sourceFormat?: string;
}

export interface RuntimeExecutionResult {
  result: boolean;
  trace: Array<{
    nodeIndex: number;
    operatorId: number;
    outcome: boolean;
  }>;
  metadata: CompiledRuleMetadata;
}
