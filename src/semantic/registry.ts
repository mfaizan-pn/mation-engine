/**
 * What: Versioned registry with stable IDs for rules/operands/operators/functions.
 * Why: Defines legal semantics and keeps compile/runtime resolution deterministic.
 * How to use:
 * `const registry = createDefaultSemanticRegistry();`
 */
import {
  FunctionDefinition,
  OperandDefinition,
  OperatorArity,
  OperatorDefinition,
  RegistryExtensionState,
  RuleCategoryDefinition,
  RuleCategoryKey,
  RuntimeFunctionImplementation,
} from "./types";

const hashToStablePositiveInt = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const toTimestamp = (value: unknown): number | null => {
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isNaN(millis) ? null : millis;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const millis = Date.parse(value);
    return Number.isNaN(millis) ? null : millis;
  }
  return null;
};

const OPERATOR_PRESET_IMPLEMENTATIONS: Record<
  NonNullable<RegistryExtensionState["functionPresets"][number]["preset"]>,
  RuntimeFunctionImplementation
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
  DATE_AFTER: (left: unknown, right: unknown) => {
    const leftTs = toTimestamp(left);
    const rightTs = toTimestamp(right);
    if (leftTs === null || rightTs === null) {
      return false;
    }
    return leftTs > rightTs;
  },
  DATE_BEFORE: (left: unknown, right: unknown) => {
    const leftTs = toTimestamp(left);
    const rightTs = toTimestamp(right);
    if (leftTs === null || rightTs === null) {
      return false;
    }
    return leftTs < rightTs;
  },
  DATE_EQUALS: (left: unknown, right: unknown) => {
    const leftTs = toTimestamp(left);
    const rightTs = toTimestamp(right);
    if (leftTs === null || rightTs === null) {
      return false;
    }
    return leftTs === rightTs;
  },
  DATE_BETWEEN: (value: unknown, range: unknown) => {
    const valueTs = toTimestamp(value);
    if (valueTs === null) {
      return false;
    }
    if (typeof range !== "object" || range === null) {
      return false;
    }

    const startTs = toTimestamp((range as { start?: unknown }).start);
    const endTs = toTimestamp((range as { end?: unknown }).end);
    if (startTs === null || endTs === null) {
      return false;
    }

    return valueTs >= startTs && valueTs <= endTs;
  },
  COMMON_EXISTS: (value: unknown) => value !== undefined && value !== null,
};

const toOperatorArity = (arity: number): OperatorArity => {
  if (arity <= 1) {
    return "UNARY";
  }
  if (arity === 2) {
    return "BINARY";
  }
  return "VARIADIC";
};

export class SemanticRegistry {
  private readonly ruleCategoryByKey = new Map<
    RuleCategoryKey,
    RuleCategoryDefinition
  >();
  private readonly operandByKey = new Map<string, OperandDefinition>();
  private readonly operatorByIdentity = new Map<string, OperatorDefinition>();
  private readonly operatorById = new Map<number, OperatorDefinition>();
  private readonly operandKeyByOperatorId = new Map<number, string>();
  private readonly functionByOperatorId = new Map<number, FunctionDefinition>();
  private readonly extensionState: RegistryExtensionState = {
    version: "1.0.0",
    operands: [],
    operators: [],
    functionPresets: [],
  };

  public constructor(public readonly version: string) {}

  public registerRuleCategory(category: RuleCategoryDefinition): void {
    this.ruleCategoryByKey.set(category.key, category);
  }

  public registerOperand(input: {
    key: string;
    group: RuleCategoryKey;
    description?: string;
  }): OperandDefinition {
    const existing = this.operandByKey.get(input.key);
    if (existing) {
      return existing;
    }

    const category = this.ruleCategoryByKey.get(input.group);
    if (!category) {
      throw new Error(`Unknown rule category: ${input.group}`);
    }

    const operand: OperandDefinition = {
      id: hashToStablePositiveInt(`operand:${input.group}:${input.key}`),
      key: input.key,
      ruleCategoryId: category.id,
      description: input.description,
    };
    this.operandByKey.set(operand.key, operand);
    this.extensionState.operands.push(input);
    return operand;
  }

  public registerOperator(input: {
    key: string;
    operand: string;
    arity: number;
    description?: string;
  }): OperatorDefinition {
    const operand = this.operandByKey.get(input.operand);
    if (!operand) {
      throw new Error(`Unknown operand: ${input.operand}`);
    }

    const identity = `${input.operand}:${input.key}`;
    const existing = this.operatorByIdentity.get(identity);
    if (existing) {
      return existing;
    }

    const operator: OperatorDefinition = {
      id: hashToStablePositiveInt(`operator:${identity}`),
      key: input.key,
      operandId: operand.id,
      arity: toOperatorArity(input.arity),
      parameterTypes: [],
      returnType: "boolean",
      pure: true,
      deterministic: true,
      translationSupport: ["INTERPRETER"],
      description: input.description,
    };

    this.operatorByIdentity.set(identity, operator);
    this.operatorById.set(operator.id, operator);
    this.operandKeyByOperatorId.set(operator.id, input.operand);
    this.extensionState.operators.push(input);
    return operator;
  }

  public registerFunctionPreset(input: {
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
  }): FunctionDefinition {
    const operator = this.getOperator(input.operand, input.operator);
    if (!operator) {
      throw new Error(
        `Unknown operator identity for function: ${input.operand}:${input.operator}`,
      );
    }

    const definition: FunctionDefinition = {
      operatorId: operator.id,
      stableId: input.key,
      implementation: OPERATOR_PRESET_IMPLEMENTATIONS[input.preset],
      preset: input.preset,
    };
    this.functionByOperatorId.set(operator.id, definition);
    this.extensionState.functionPresets.push(input);
    return definition;
  }

  public getOperand(operandKey: string): OperandDefinition | undefined {
    return this.operandByKey.get(operandKey);
  }

  public getOperator(
    operandKey: string,
    operatorKey: string,
  ): OperatorDefinition | undefined {
    return this.operatorByIdentity.get(`${operandKey}:${operatorKey}`);
  }

  public getOperatorById(operatorId: number): OperatorDefinition | undefined {
    return this.operatorById.get(operatorId);
  }

  public getFunctionByOperatorId(
    operatorId: number,
  ): FunctionDefinition | undefined {
    return this.functionByOperatorId.get(operatorId);
  }

  public getRuleCategoryById(
    ruleCategoryId: number,
  ): RuleCategoryDefinition | undefined {
    for (const category of this.ruleCategoryByKey.values()) {
      if (category.id === ruleCategoryId) {
        return category;
      }
    }
    return undefined;
  }

  public listOperands(): ReadonlyArray<OperandDefinition> {
    return [...this.operandByKey.values()];
  }

  public listOperators(operandKey?: string): ReadonlyArray<
    OperatorDefinition & {
      operandKey: string;
    }
  > {
    const operators = [...this.operatorById.values()].map((operator) => ({
      ...operator,
      operandKey: this.operandKeyByOperatorId.get(operator.id) ?? "",
    }));

    if (!operandKey) {
      return operators;
    }

    return operators.filter((operator) => operator.operandKey === operandKey);
  }

  public getSnapshot(): RegistryExtensionState {
    return {
      version: this.extensionState.version,
      operands: [...this.extensionState.operands],
      operators: [...this.extensionState.operators],
      functionPresets: [...this.extensionState.functionPresets],
    };
  }

  public hydrateExtensions(state: RegistryExtensionState): void {
    for (const operand of state.operands) {
      this.registerOperand(operand);
    }
    for (const operator of state.operators) {
      this.registerOperator(operator);
    }
    for (const fn of state.functionPresets) {
      this.registerFunctionPreset(fn);
    }
  }
}

export const createDefaultSemanticRegistry = (): SemanticRegistry => {
  const registry = new SemanticRegistry("1.0.0");

  registry.registerRuleCategory({ id: 1, key: "EVALUATION" });
  registry.registerRuleCategory({ id: 2, key: "VALIDATION" });
  registry.registerRuleCategory({ id: 3, key: "AUTHORIZATION" });
  registry.registerRuleCategory({ id: 4, key: "USER" });

  const registerOperand = (
    key: string,
    group: RuleCategoryKey,
    description: string,
  ) => registry.registerOperand({ key, group, description });

  registerOperand("STRING", "EVALUATION", "String comparison operand family");
  registerOperand("NUMBER", "EVALUATION", "Numeric comparison operand family");
  registerOperand("DATE", "EVALUATION", "Date comparison operand family");
  registerOperand("ARRAY", "EVALUATION", "Array comparison operand family");
  registerOperand("OBJECT", "EVALUATION", "Object comparison operand family");
  registerOperand("JSON", "EVALUATION", "JSON comparison operand family");
  registerOperand("COMMON", "EVALUATION", "Logical/assertion/nullish family");
  registerOperand("SIGNATURE", "VALIDATION", "Signature validation family");
  registerOperand("TYPE", "VALIDATION", "Type validation family");
  registerOperand("CAN", "AUTHORIZATION", "Authorization capability family");
  registerOperand("LIMITED", "AUTHORIZATION", "Authorization limit family");

  const registerOperator = (
    key: string,
    operand: string,
    arity: number,
    description: string,
  ) => registry.registerOperator({ key, operand, arity, description });

  registerOperator("CONTAINS", "STRING", 2, "Substring check");
  registerOperator("ENDS_WITH", "STRING", 2, "Suffix check");
  registerOperator("GREATER_THAN", "NUMBER", 2, "Greater-than check");
  registerOperator("LESS_THAN", "NUMBER", 2, "Less-than check");
  registerOperator("AFTER", "DATE", 2, "Date is after reference");
  registerOperator("BEFORE", "DATE", 2, "Date is before reference");
  registerOperator("EQUALS", "DATE", 2, "Date equals reference");
  registerOperator("BETWEEN", "DATE", 2, "Date is between start and end");
  registerOperator("EXISTS", "COMMON", 1, "Not null/undefined check");
  registerOperator("AND", "COMMON", 2, "Logical conjunction");
  registerOperator("OR", "COMMON", 2, "Logical disjunction");

  registry.registerFunctionPreset({
    key: "STRING:CONTAINS",
    operand: "STRING",
    operator: "CONTAINS",
    preset: "STRING_CONTAINS",
  });
  registry.registerFunctionPreset({
    key: "STRING:ENDS_WITH",
    operand: "STRING",
    operator: "ENDS_WITH",
    preset: "STRING_ENDS_WITH",
  });
  registry.registerFunctionPreset({
    key: "NUMBER:GREATER_THAN",
    operand: "NUMBER",
    operator: "GREATER_THAN",
    preset: "NUMBER_GREATER_THAN",
  });
  registry.registerFunctionPreset({
    key: "DATE:AFTER",
    operand: "DATE",
    operator: "AFTER",
    preset: "DATE_AFTER",
  });
  registry.registerFunctionPreset({
    key: "DATE:BEFORE",
    operand: "DATE",
    operator: "BEFORE",
    preset: "DATE_BEFORE",
  });
  registry.registerFunctionPreset({
    key: "DATE:EQUALS",
    operand: "DATE",
    operator: "EQUALS",
    preset: "DATE_EQUALS",
  });
  registry.registerFunctionPreset({
    key: "DATE:BETWEEN",
    operand: "DATE",
    operator: "BETWEEN",
    preset: "DATE_BETWEEN",
  });
  registry.registerFunctionPreset({
    key: "COMMON:EXISTS",
    operand: "COMMON",
    operator: "EXISTS",
    preset: "COMMON_EXISTS",
  });

  return registry;
};
