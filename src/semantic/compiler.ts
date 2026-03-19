/**
 * What: Compile-time pipeline implementation (input -> DSL -> IR -> binary artifact).
 * Why: Produces portable, metadata-rich compiled rule assets.
 * How to use:
 * `const artifact = compiler.compile({ ruleId, input });`
 */
import { SemanticRegistry } from "./registry";
import { UniversalDslParser } from "./parser";
import { UniversalDslValidator } from "./validator";
import { lowerDslToCanonicalIr } from "./ir";
import { normalizeDsl } from "./normalizer";
import { buildCompiledArtifact, CompressionCodec } from "./codec";
import { CompileRequest, CompiledRuleArtifact, RuleInput } from "./types";

const gatherReferencedFields = (
  node: ReturnType<typeof normalizeDsl>["root"],
  fields: Set<string>,
): void => {
  if (node.nodeType === "logical") {
    node.children.forEach((child) => gatherReferencedFields(child, fields));
    return;
  }
  if (node.subject.type === "path") {
    fields.add(node.subject.value);
  }
  if (node.reference?.type === "path") {
    fields.add(node.reference.value);
  }
};

const gatherOperatorsAndOperands = (
  node: ReturnType<typeof normalizeDsl>["root"],
  operands: Set<string>,
  operators: Set<string>,
): void => {
  if (node.nodeType === "logical") {
    operators.add(node.operatorKey);
    node.children.forEach((child) =>
      gatherOperatorsAndOperands(child, operands, operators),
    );
    return;
  }
  operands.add(node.operandKey);
  operators.add(`${node.operandKey}:${node.operatorKey}`);
};

export class SemanticRuleCompiler {
  private readonly parser = new UniversalDslParser();
  private readonly validator: UniversalDslValidator;

  public constructor(
    private readonly registry: SemanticRegistry,
    private readonly codec: CompressionCodec,
  ) {
    this.validator = new UniversalDslValidator(registry);
  }

  public compile(request: CompileRequest): CompiledRuleArtifact {
    const parsedDsl = this.parser.parse(
      request.ruleId,
      request.input,
      request.metadata,
    );

    const normalizedDsl = normalizeDsl(parsedDsl);
    const validation = this.validator.validate(normalizedDsl);
    if (!validation.isValid) {
      throw new Error(
        `Compilation failed for ${request.ruleId}: ${validation.errors.join(" | ")}`,
      );
    }

    const canonicalIr = lowerDslToCanonicalIr(normalizedDsl, this.registry);
    const referencedFields = new Set<string>();
    gatherReferencedFields(normalizedDsl.root, referencedFields);
    const usedOperands = new Set<string>();
    const usedOperators = new Set<string>();
    gatherOperatorsAndOperands(normalizedDsl.root, usedOperands, usedOperators);

    const now = new Date().toISOString();
    return buildCompiledArtifact(
      {
        rule_id: request.ruleId,
        rule_name:
          typeof request.metadata?.rule_name === "string"
            ? request.metadata.rule_name
            : request.ruleId,
        registry_version: this.registry.version,
        dsl_version: 1,
        ast_version: canonicalIr.astVersion,
        storage_version: 1,
        source_language: request.sourceLanguage ?? "JSON",
        source_format: request.sourceFormat ?? "RuleInput",
        created_at: now,
        updated_at: now,
        root_node_index: canonicalIr.rootNodeIndex,
        referenced_fields: [...referencedFields],
        used_operands: [...usedOperands],
        used_operators: [...usedOperators],
        expected_input_types: [],
        null_semantics: "strict",
        coercion_policy: "none",
        verbosity: "INFO",
        inversion_flag: false,
        metrics_enabled: true,
        system_defined: false,
        semantic_metadata: request.metadata,
      },
      canonicalIr,
      this.codec,
    );
  }
}
