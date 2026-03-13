/**
 * What: Interactive CLI for condition CRUD and execution by rule ID.
 * How to use:
 * `pnpm cli:dev`
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import {
  createSemanticEngine,
  createDefaultSemanticRegistry,
  createZstdCodec,
  RuleInput,
  unpackCompiledArtifact,
  decodeCompiledIr,
  buildPipelineSnapshot,
} from "../semantic";
import {
  InMemoryCompiledRuleStorageAdapter,
  MinioCompiledRuleStorageAdapter,
} from "../integrations";
import { CompiledRuleStorageAdapter } from "../semantic/storage";
import { CompiledRuleMetadata } from "../semantic/types";

type EngineInstance = Awaited<ReturnType<typeof createSemanticEngine>>;
type OperatorArity = "UNARY" | "BINARY" | "VARIADIC" | "STRUCTURED";
type OperandOption = Awaited<
  ReturnType<EngineInstance["listOperands"]>
>[number];
type OperatorOption = Awaited<
  ReturnType<EngineInstance["listOperators"]>
>[number];

const SOURCE_INPUT_KEY = "source_input";

const createStorage = (): CompiledRuleStorageAdapter => {
  if (process.env.RULE_STORAGE_PROVIDER === "minio") {
    return MinioCompiledRuleStorageAdapter.fromEnv();
  }
  return new InMemoryCompiledRuleStorageAdapter();
};

const parseJsonInput = (raw: string): unknown => {
  if (raw.startsWith("@")) {
    const filePath = resolve(raw.slice(1));
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  }
  return JSON.parse(raw) as unknown;
};

const parseLiteral = (raw: string): unknown => {
  if (raw.length === 0) {
    return "";
  }
  try {
    return parseJsonInput(raw);
  } catch {
    return raw;
  }
};

const toMetadataRecord = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
};

const extractSourceInput = (
  metadata: CompiledRuleMetadata | null,
): RuleInput | null => {
  if (!metadata) {
    return null;
  }

  const semanticMetadata = toMetadataRecord(metadata.semantic_metadata);
  if (!semanticMetadata) {
    return null;
  }

  const source = semanticMetadata[SOURCE_INPUT_KEY];
  if (typeof source !== "object" || source === null) {
    return null;
  }

  return source as RuleInput;
};

const printSection = (title: string, value: unknown): void => {
  console.log(`\n===== ${title} =====`);
  console.log(JSON.stringify(value, null, 2));
};

const printPipeline = (
  snapshot: Awaited<ReturnType<typeof buildPipelineSnapshot>>,
): void => {
  printSection("1) SOURCE INPUT (RuleInput)", snapshot.source);
  printSection("2) PARSED UNIVERSAL DSL", snapshot.parsedDsl);
  printSection("3) NORMALIZED DSL", snapshot.normalizedDsl);
  printSection("4) VALIDATION RESULT", snapshot.validation);
  if (!snapshot.validation.isValid) {
    return;
  }
  printSection("5) CANONICAL AST / IR", snapshot.canonicalIr);
  printSection("6) COMPILED METADATA", snapshot.artifact?.metadata);
  printSection("6b) COMPRESSED PAYLOAD STATS", {
    compression_codec: snapshot.artifact?.metadata.compression_codec,
    compressed_payload_bytes:
      snapshot.packedBinaryStats?.compressedPayloadBytes,
  });
  printSection("7) BINARY STORAGE ENVELOPE", {
    total_bytes: snapshot.packedBinaryStats?.totalBytes,
    first_24_bytes_hex: snapshot.packedBinaryStats?.first24BytesHex,
  });
  printSection("8) DECODED IR (after storage roundtrip)", snapshot.decodedIr);
};

const askChoice = async (
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: string[],
): Promise<number> => {
  while (true) {
    console.log(`\n${question}`);
    options.forEach((option, index) => {
      console.log(`${index + 1}) ${option}`);
    });
    const raw = (await rl.question("Select option number: ")).trim();
    const value = Number(raw);
    if (Number.isInteger(value) && value >= 1 && value <= options.length) {
      return value - 1;
    }
    console.log("Invalid option. Try again.");
  }
};

const askNonEmpty = async (
  rl: ReturnType<typeof createInterface>,
  question: string,
): Promise<string> => {
  while (true) {
    const value = (await rl.question(question)).trim();
    if (value.length > 0) {
      return value;
    }
    console.log("Value cannot be empty.");
  }
};

const askOptionalJsonRecord = async (
  rl: ReturnType<typeof createInterface>,
  question: string,
): Promise<Record<string, unknown>> => {
  while (true) {
    const raw = (await rl.question(question)).trim();
    if (!raw) {
      return {};
    }

    try {
      const parsed = parseJsonInput(raw);
      const record = toMetadataRecord(parsed);
      if (!record) {
        console.log("Expected JSON object.");
        continue;
      }
      return record;
    } catch {
      console.log("Invalid JSON. Provide JSON object or @path-to-json-file.");
    }
  }
};

const askJsonContext = async (
  rl: ReturnType<typeof createInterface>,
): Promise<Record<string, unknown>> => {
  while (true) {
    const raw = (
      await rl.question("Context JSON (or @path-to-json-file): ")
    ).trim();
    try {
      const parsed = parseJsonInput(raw);
      const context = toMetadataRecord(parsed);
      if (!context) {
        console.log("Context must be a JSON object.");
        continue;
      }
      return context;
    } catch {
      console.log("Invalid JSON context.");
    }
  }
};

const askArityAwareReference = async (
  rl: ReturnType<typeof createInterface>,
  operatorArity: OperatorArity,
): Promise<{
  reference?: unknown;
  referenceType?: "variable" | "literal";
}> => {
  if (operatorArity === "UNARY") {
    return {};
  }

  const typeChoice = await askChoice(rl, "Reference type", [
    "Variable path (example: candidate.domain)",
    "Literal value",
  ]);

  if (typeChoice === 0) {
    const referencePath = await askNonEmpty(rl, "Reference path: ");
    return {
      reference: referencePath,
      referenceType: "variable",
    };
  }

  const rawLiteral = (
    await rl.question("Reference literal (JSON or raw text): ")
  ).trim();
  return {
    reference: parseLiteral(rawLiteral),
    referenceType: "literal",
  };
};

const getSelectableOperands = async (
  engine: EngineInstance,
): Promise<
  Array<{
    operand: OperandOption;
    operators: OperatorOption[];
  }>
> => {
  const operands = await engine.listOperands();
  const options: Array<{
    operand: OperandOption;
    operators: OperatorOption[];
  }> = [];

  for (const operand of operands) {
    const operators = await engine.listOperators({ operand: operand.key });
    if (operators.length > 0) {
      options.push({
        operand,
        operators: [...operators],
      });
    }
  }

  return options;
};

const buildAtomicCondition = async (
  rl: ReturnType<typeof createInterface>,
  engine: EngineInstance,
): Promise<RuleInput> => {
  const selectableOperands = await getSelectableOperands(engine);
  if (selectableOperands.length === 0) {
    throw new Error(
      "No executable operands found. Register operators/functions first.",
    );
  }

  const operandIndex = await askChoice(
    rl,
    "Select operand",
    selectableOperands.map(
      ({ operand, operators }) =>
        `${operand.key} (${operand.group}) - ${operators.length} operator(s)`,
    ),
  );
  const selected = selectableOperands[operandIndex];
  const selectedOperand = selected.operand;
  const operators = selected.operators;

  const operatorIndex = await askChoice(
    rl,
    `Select operator for ${selectedOperand.key}`,
    operators.map(
      (operator) =>
        `${operator.key} [${operator.arity}]${operator.description ? ` - ${operator.description}` : ""}`,
    ),
  );
  const selectedOperator = operators[operatorIndex];

  const subjectType = await askChoice(rl, "Subject type", [
    "Variable path (example: candidate.email)",
    "Literal value",
  ]);

  const subject =
    subjectType === 0
      ? await askNonEmpty(rl, "Subject path: ")
      : parseLiteral(
          (await rl.question("Subject literal (JSON or raw text): ")).trim(),
        );

  const reference = await askArityAwareReference(rl, selectedOperator.arity);

  return {
    operand: selectedOperand.key,
    operator: selectedOperator.key,
    subject,
    ...(subjectType === 1 ? { subjectType: "literal" as const } : {}),
    ...reference,
  };
};

const buildConditionInteractively = async (
  rl: ReturnType<typeof createInterface>,
  engine: EngineInstance,
  depth = 0,
): Promise<RuleInput> => {
  if (depth === 0) {
    console.log("\nCondition types:");
    console.log("- Single condition: one check");
    console.log("- Condition group: combine checks with AND/OR");
  }

  const nodeType = await askChoice(
    rl,
    `${" ".repeat(depth * 2)}Choose condition type`,
    ["Single condition (one check)", "Condition group (AND/OR)"],
  );

  if (nodeType === 0) {
    return await buildAtomicCondition(rl, engine);
  }

  const combinatorIndex = await askChoice(rl, "How to combine children", [
    "AND (all child conditions must pass)",
    "OR (any child condition can pass)",
  ]);
  const combinator = combinatorIndex === 0 ? "AND" : "OR";

  let childCount = 0;
  while (childCount < 1) {
    const raw = (await rl.question("Number of child conditions: ")).trim();
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed >= 1) {
      childCount = parsed;
      break;
    }
    console.log("Provide a number greater than or equal to 1.");
  }

  const conditions: RuleInput[] = [];
  for (let index = 0; index < childCount; index += 1) {
    console.log(`\nBuilding child ${index + 1}/${childCount}`);
    conditions.push(await buildConditionInteractively(rl, engine, depth + 1));
  }

  return {
    combinator,
    conditions,
  };
};

const createInspectionRegistry = async (
  storage: CompiledRuleStorageAdapter,
): Promise<ReturnType<typeof createDefaultSemanticRegistry>> => {
  const registry = createDefaultSemanticRegistry();
  const extensionState = await storage.loadRegistryExtensions?.();
  if (extensionState) {
    registry.hydrateExtensions(extensionState);
  }
  return registry;
};

const handleCreateCondition = async (args: {
  rl: ReturnType<typeof createInterface>;
  engine: Awaited<ReturnType<typeof createSemanticEngine>>;
  storage: CompiledRuleStorageAdapter;
}) => {
  const ruleId = await askNonEmpty(args.rl, "Rule ID: ");
  const existing = await args.engine.getRuleMetadata(ruleId);
  if (existing) {
    const overwrite = await askChoice(args.rl, "Rule exists. Continue?", [
      "No",
      "Yes, overwrite",
    ]);
    if (overwrite === 0) {
      return;
    }
  }

  const input = await buildConditionInteractively(args.rl, args.engine);
  const userMetadata = await askOptionalJsonRecord(
    args.rl,
    "Optional metadata JSON (blank to skip): ",
  );
  const metadata = { ...userMetadata, [SOURCE_INPUT_KEY]: input };

  const registry = await createInspectionRegistry(args.storage);
  const codec = await createZstdCodec();
  const snapshot = await buildPipelineSnapshot({
    registry,
    codec,
    ruleId,
    input,
    metadata,
  });

  printPipeline(snapshot);
  if (!snapshot.validation.isValid) {
    console.log("\nRule not stored because validation failed.");
    return;
  }

  await args.engine.compileAndStore(ruleId, input, metadata);
  console.log("\nRule stored successfully.");
};

const handleListConditions = async (
  engine: Awaited<ReturnType<typeof createSemanticEngine>>,
) => {
  const ruleIds = await engine.listRuleIds();
  printSection("RULE IDS", ruleIds);
};

const handleGetCondition = async (args: {
  rl: ReturnType<typeof createInterface>;
  engine: Awaited<ReturnType<typeof createSemanticEngine>>;
  storage: CompiledRuleStorageAdapter;
}) => {
  const ruleId = await askNonEmpty(args.rl, "Rule ID: ");
  const metadata = await args.engine.getRuleMetadata(ruleId);
  if (!metadata) {
    console.log("Rule not found.");
    return;
  }

  const packed = await args.storage.loadRuleArtifact(ruleId);
  printSection("RULE METADATA", metadata);
  printSection("STORED SOURCE INPUT", extractSourceInput(metadata));

  if (!packed) {
    console.log("Artifact binary not found in storage.");
    return;
  }

  const unpacked = unpackCompiledArtifact(packed);
  const codec = await createZstdCodec();
  const decodedIr = decodeCompiledIr(unpacked, codec);
  printSection("CANONICAL IR (decoded from stored artifact)", decodedIr);
};

const handleModifyCondition = async (args: {
  rl: ReturnType<typeof createInterface>;
  engine: Awaited<ReturnType<typeof createSemanticEngine>>;
  storage: CompiledRuleStorageAdapter;
}) => {
  const ruleId = await askNonEmpty(args.rl, "Rule ID to modify: ");
  const metadata = await args.engine.getRuleMetadata(ruleId);
  if (!metadata) {
    console.log("Rule not found.");
    return;
  }

  const updatedInput = await buildConditionInteractively(args.rl, args.engine);
  const extraMetadata = await askOptionalJsonRecord(
    args.rl,
    "Optional metadata patch JSON (blank to skip): ",
  );

  const existingMetadata = toMetadataRecord(metadata.semantic_metadata) ?? {};
  const mergedMetadata = {
    ...existingMetadata,
    ...extraMetadata,
    [SOURCE_INPUT_KEY]: updatedInput,
  };

  const registry = await createInspectionRegistry(args.storage);
  const codec = await createZstdCodec();
  const snapshot = await buildPipelineSnapshot({
    registry,
    codec,
    ruleId,
    input: updatedInput,
    metadata: mergedMetadata,
  });
  printPipeline(snapshot);

  if (!snapshot.validation.isValid) {
    console.log("\nRule not updated because validation failed.");
    return;
  }

  await args.engine.compileAndStore(ruleId, updatedInput, mergedMetadata);
  console.log("\nRule updated successfully.");
};

const handleDeleteCondition = async (args: {
  rl: ReturnType<typeof createInterface>;
  engine: Awaited<ReturnType<typeof createSemanticEngine>>;
}) => {
  const ruleId = await askNonEmpty(args.rl, "Rule ID to delete: ");
  const confirm = await askChoice(args.rl, `Delete ${ruleId}?`, [
    "No",
    "Yes, delete",
  ]);
  if (confirm === 0) {
    return;
  }

  const deleted = await args.engine.deleteRule(ruleId);
  console.log(deleted ? "Rule deleted." : "Rule not found.");
};

const handleExecuteCondition = async (args: {
  rl: ReturnType<typeof createInterface>;
  engine: Awaited<ReturnType<typeof createSemanticEngine>>;
  storage: CompiledRuleStorageAdapter;
}) => {
  const ruleId = await askNonEmpty(args.rl, "Rule ID to execute: ");
  const metadata = await args.engine.getRuleMetadata(ruleId);
  if (!metadata) {
    console.log("Rule not found.");
    return;
  }

  const sourceInput = extractSourceInput(metadata);
  if (sourceInput) {
    const registry = await createInspectionRegistry(args.storage);
    const codec = await createZstdCodec();
    const snapshot = await buildPipelineSnapshot({
      registry,
      codec,
      ruleId,
      input: sourceInput,
      metadata: toMetadataRecord(metadata.semantic_metadata),
    });
    printPipeline(snapshot);
  } else {
    printSection(
      "SOURCE INPUT",
      "Not available in semantic_metadata.source_input",
    );
    const packed = await args.storage.loadRuleArtifact(ruleId);
    if (packed) {
      const unpacked = unpackCompiledArtifact(packed);
      const codec = await createZstdCodec();
      const decoded = decodeCompiledIr(unpacked, codec);
      printSection("6) COMPILED METADATA", unpacked.metadata);
      printSection("7) BINARY STORAGE ENVELOPE", {
        total_bytes: packed.length,
        first_24_bytes_hex: packed.subarray(0, 24).toString("hex"),
      });
      printSection("8) DECODED IR (after storage roundtrip)", decoded);
    }
  }

  const context = await askJsonContext(args.rl);
  const result = await args.engine.executeById(ruleId, context);
  printSection("9) EXECUTION RESULT", result);
};

const runCli = async (): Promise<void> => {
  const rl = createInterface({ input, output });
  const storage = createStorage();
  const engine = await createSemanticEngine({ storage });

  console.log("\nMation Engine CLI");
  console.log(
    `Storage provider: ${process.env.RULE_STORAGE_PROVIDER ?? "memory"}`,
  );

  try {
    while (true) {
      const selected = await askChoice(rl, "Choose action", [
        "Create condition (returns pipeline)",
        "List conditions",
        "Get condition",
        "Modify condition",
        "Delete condition",
        "Execute condition (pipeline + result)",
        "Exit",
      ]);

      try {
        if (selected === 0) {
          await handleCreateCondition({ rl, engine, storage });
        } else if (selected === 1) {
          await handleListConditions(engine);
        } else if (selected === 2) {
          await handleGetCondition({ rl, engine, storage });
        } else if (selected === 3) {
          await handleModifyCondition({ rl, engine, storage });
        } else if (selected === 4) {
          await handleDeleteCondition({ rl, engine });
        } else if (selected === 5) {
          await handleExecuteCondition({ rl, engine, storage });
        } else {
          break;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown action failure";
        console.log(`Action failed: ${message}`);
      }
    }
  } finally {
    rl.close();
  }
};

runCli().catch((error: unknown) => {
  if (
    error instanceof Error &&
    (error.message.includes("readline was closed") ||
      ("code" in error &&
        (error as { code?: string }).code === "ERR_USE_AFTER_CLOSE"))
  ) {
    process.exitCode = 0;
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
