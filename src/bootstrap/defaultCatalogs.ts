/**
 * What: Default operand/operator catalogs shipped with MVP.
 * Why: Engine starts useful out-of-the-box without manual registration.
 * How to use:
 * `createEngine()` auto-loads these unless `includeDefaults: false`.
 */
import { createOperands } from "../../utils/createOperands";
import { OperandDefinition, OperatorDefinition } from "../repositories";

const evaluationOperands = createOperands([
  "STRING",
  "NUMBER",
  "DATE",
  "ARRAY",
  "OBJECT",
  "JSON",
  "COMMON",
] as const);

const validationOperands = createOperands(["SIGNATURE", "TYPE"] as const);
const authorizationOperands = createOperands(["CAN", "LIMITED"] as const);

const toDefinitions = (
  keys: ReadonlyArray<string>,
  group: string,
): ReadonlyArray<OperandDefinition> =>
  keys.map((key) => ({
    key,
    group,
  }));

export const DEFAULT_OPERANDS: ReadonlyArray<OperandDefinition> = [
  ...toDefinitions(
    [
      evaluationOperands.STRING,
      evaluationOperands.NUMBER,
      evaluationOperands.DATE,
      evaluationOperands.ARRAY,
      evaluationOperands.OBJECT,
      evaluationOperands.JSON,
      evaluationOperands.COMMON,
    ],
    "EVALUATION",
  ),
  ...toDefinitions(
    [validationOperands.SIGNATURE, validationOperands.TYPE],
    "VALIDATION",
  ),
  ...toDefinitions(
    [authorizationOperands.CAN, authorizationOperands.LIMITED],
    "AUTHORIZATION",
  ),
];

export const DEFAULT_OPERATORS: ReadonlyArray<OperatorDefinition> = [
  { key: "EQUALS", operand: "STRING", arity: 2 },
  { key: "CONTAINS", operand: "STRING", arity: 2 },
  { key: "STARTS_WITH", operand: "STRING", arity: 2 },
  { key: "ENDS_WITH", operand: "STRING", arity: 2 },
  { key: "EQUALS", operand: "NUMBER", arity: 2 },
  { key: "GREATER_THAN", operand: "NUMBER", arity: 2 },
  { key: "LESS_THAN", operand: "NUMBER", arity: 2 },
  { key: "BETWEEN", operand: "NUMBER", arity: 2 },
  { key: "BEFORE", operand: "DATE", arity: 2 },
  { key: "AFTER", operand: "DATE", arity: 2 },
  { key: "CONTAINS", operand: "ARRAY", arity: 2 },
  { key: "EQUALS", operand: "OBJECT", arity: 2 },
  { key: "EQUALS", operand: "JSON", arity: 2 },
  { key: "AND", operand: "COMMON", arity: 2 },
  { key: "OR", operand: "COMMON", arity: 2 },
  { key: "ASSERT", operand: "COMMON", arity: 1 },
  { key: "ASSERT_NOT", operand: "COMMON", arity: 1 },
  { key: "EXISTS", operand: "COMMON", arity: 1 },
];
