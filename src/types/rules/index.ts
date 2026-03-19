/**
 * What: Legacy + current rule catalogs, operators, and schema definitions.
 * Why: Central place for rule typing during MVP evolution.
 * How to use:
 * `import { ZRuleSchema } from "../types/rules";`
 * Note: This file is intentionally broad and will be further modularized.
 */
import { z } from "zod";

export interface IRule {}

const RuleSchema = [
  "EVALUATION",
  "VALIDATION",
  "AUTHORIZATION",
  "USER",
] as const;

const rules = createOperands([
  "EVALUATION",
  "VALIDATION",
  "AUTHORIZATION",
] as const);

const operands = {
  [rules.VALIDATION]: createOperands(["SIGNATURE", "TYPE"] as const),
  [rules.EVALUATION]: createOperands([
    "STRING",
    "NUMBER",
    "DATE",
    "ARRAY",
    "OBJECT",
    "JSON",
    "COMMON",
  ] as const),
  [rules.AUTHORIZATION]: createOperands(["CAN", "LIMITED"] as const),
};

const operators = {
  [operands.EVALUATION.STRING]: createOperands([
    "EQUALS",
    "CONTAINS",
    "STARTS_WITH",
    "ENDS_WITH",
    "LENGTH_EQUALS",
    "LENGTH_GREATER_THAN",
    "LENGTH_LESS_THAN",
    // "MATCHES_PATTERN",
    // "MATCHES_FUZZY",
  ] as const),
  [operands.EVALUATION.NUMBER]: createOperands([
    "EQUALS",
    "GREATER_THAN",
    "LESS_THAN",
    "AROUND", // checks with the specified threshold, if the number is under that, returns true
    "IS_NEGATIVE",
    "IS_ZERO",
    "IS_DECIMAL",
    "IS_PRECISION",
    "BETWEEN",
    "IS_EVEN",
    "IS_DIVISIBLE_BY",
    "IS_MULTIPLE_OF",
    "IS_FACTOR_OF",
  ] as const),
  [operands.EVALUATION.DATE]: createOperands([
    "EQUALS",
    "BEFORE",
    "AFTER",
    "BETWEEN",
  ] as const),
  [operands.EVALUATION.ARRAY]: createOperands([
    "CONTAINS",
    "EQUALS",
    "LENGTH_GREATER_THAN",
    "LENGTH_EQUALS",
    "LENGTH_LESS_THAN",
    "LENGTH_BETWEEN",
    "SATISFIES",
  ] as const),
  [operands.EVALUATION.OBJECT]: createOperands([
    "EQUALS",
    "CONTAINS",
    "SATISFIES",
  ] as const),
  [operands.EVALUATION.JSON]: createOperands(["EQUALS", "SATISFIES"] as const),
  [operands.EVALUATION.COMMON]: {
    ASSERTION: createOperands(["ASSERT", "ASSERT_NOT"] as const),
    NULLISH: createOperands([
      "IS_EMPTY",
      "IS_NULL",
      "IS_NAN",
      "IS_UNDEFINED",
      "EXISTS",
    ] as const),
    LOGICAL: createOperands(["AND", "OR"] as const),
  },
};
// Complete NUMBER functions
const functions = {
  [operands.EVALUATION.STRING]: {
    [operators["STRING"]["CONTAINS"]]: (term: string, value: string): boolean =>
      value.includes(term),
    [operators["STRING"]["ENDS_WITH"]]: (
      term: string,
      value: string,
    ): boolean => value.endsWith(term),
    [operators["STRING"]["STARTS_WITH"]]: (
      term: string,
      value: string,
    ): boolean => value.startsWith(term),
    [operators["STRING"]["EQUALS"]]: (term: string, value: string): boolean =>
      term == value,
    [operators["STRING"]["LENGTH_EQUALS"]]: (
      term: string,
      value: number,
    ): boolean => term.length == value,
    [operators["STRING"]["LENGTH_GREATER_THAN"]]: (
      term: string,
      value: number,
    ): boolean => term.length > value,
    [operators["STRING"]["LENGTH_LESS_THAN"]]: (
      term: string,
      value: number,
    ): boolean => term.length < value,
  },

  [operands.EVALUATION.NUMBER]: {
    [operators["NUMBER"]["EQUALS"]]: (lhs: number, rhs: number): boolean =>
      lhs === rhs,
    [operators["NUMBER"]["GREATER_THAN"]]: (
      lhs: number,
      rhs: number,
    ): boolean => lhs > rhs,
    [operators["NUMBER"]["LESS_THAN"]]: (lhs: number, rhs: number): boolean =>
      lhs < rhs,
    [operators["NUMBER"]["AROUND"]]: (
      value: number,
      target: number,
      threshold: number,
    ): boolean => Math.abs(value - target) <= threshold,
    [operators["NUMBER"]["IS_NEGATIVE"]]: (value: number): boolean => value < 0,
    [operators["NUMBER"]["IS_ZERO"]]: (value: number): boolean => value === 0,
    [operators["NUMBER"]["IS_DECIMAL"]]: (value: number): boolean =>
      value % 1 !== 0,
    [operators["NUMBER"]["IS_PRECISION"]]: (
      value: number,
      precision: number,
    ): boolean => {
      const str = value.toString();
      const decimalPointIndex = str.indexOf(".");
      if (decimalPointIndex === -1) return precision === 0;
      return str.length - decimalPointIndex - 1 === precision;
    },
    [operators["NUMBER"]["BETWEEN"]]: (
      value: number,
      range: { min: number; max: number },
    ): boolean => value > range.min && value < range.max,
    [operators["NUMBER"]["IS_EVEN"]]: (value: number): boolean =>
      value % 2 === 0,
    [operators["NUMBER"]["IS_DIVISIBLE_BY"]]: (
      value: number,
      divisor: number,
    ): boolean => divisor !== 0 && value % divisor === 0,
    [operators["NUMBER"]["IS_MULTIPLE_OF"]]: (
      value: number,
      base: number,
    ): boolean => base !== 0 && value % base === 0,
    [operators["NUMBER"]["IS_FACTOR_OF"]]: (
      factor: number,
      value: number,
    ): boolean => factor !== 0 && value % factor === 0,
  },

  [operands.EVALUATION.DATE]: {
    [operators["DATE"]["EQUALS"]]: (date1: Date, date2: Date): boolean =>
      date1.getTime() === date2.getTime(),
    [operators["DATE"]["BEFORE"]]: (date: Date, referenceDate: Date): boolean =>
      date.getTime() < referenceDate.getTime(),
    [operators["DATE"]["AFTER"]]: (date: Date, referenceDate: Date): boolean =>
      date.getTime() > referenceDate.getTime(),
    [operators["DATE"]["BETWEEN"]]: (
      date: Date,
      range: { start: Date; end: Date },
    ): boolean =>
      date.getTime() > range.start.getTime() &&
      date.getTime() < range.end.getTime(),
  },

  [operands.EVALUATION.ARRAY]: {
    [operators["ARRAY"]["CONTAINS"]]: (array: any[], value: any): boolean =>
      array.includes(value),
    [operators["ARRAY"]["EQUALS"]]: (array1: any[], array2: any[]): boolean => {
      if (array1.length !== array2.length) return false;

      for (let i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i]) return false;
      }

      return true;
    },
    [operators["ARRAY"]["LENGTH_GREATER_THAN"]]: (
      array: any[],
      length: number,
    ): boolean => array.length > length,
    [operators["ARRAY"]["LENGTH_EQUALS"]]: (
      array: any[],
      length: number,
    ): boolean => array.length === length,
    [operators["ARRAY"]["LENGTH_LESS_THAN"]]: (
      array: any[],
      length: number,
    ): boolean => array.length < length,
    [operators["ARRAY"]["LENGTH_BETWEEN"]]: (
      array: any[],
      range: { min: number; max: number },
    ): boolean => array.length > range.min && array.length < range.max,
    [operators["ARRAY"]["SATISFIES"]]: (
      array: any[],
      predicate: (item: any) => boolean,
    ): boolean => array.some(predicate),
  },

  [operands.EVALUATION.OBJECT]: {
    [operators["OBJECT"]["EQUALS"]]: (
      obj1: Record<string, any>,
      obj2: Record<string, any>,
    ): boolean => {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return false;

      for (const key of keys1) {
        if (obj1[key] !== obj2[key]) return false;
      }

      return true;
    },
    [operators["OBJECT"]["CONTAINS"]]: (
      obj: Record<string, any>,
      key: string,
    ): boolean => key in obj,
    [operators["OBJECT"]["SATISFIES"]]: (
      obj: Record<string, any>,
      predicate: (key: string, value: any) => boolean,
    ): boolean => {
      for (const [key, value] of Object.entries(obj)) {
        if (predicate(key, value)) return true;
      }
      return false;
    },
  },

  [operands.EVALUATION.JSON]: {
    [operators["JSON"]["EQUALS"]]: (json1: string, json2: string): boolean => {
      try {
        const obj1 = JSON.parse(json1);
        const obj2 = JSON.parse(json2);

        return JSON.stringify(obj1) === JSON.stringify(obj2);
      } catch (e) {
        return false;
      }
    },
    [operators["JSON"]["SATISFIES"]]: (
      json: string,
      predicate: (obj: any) => boolean,
    ): boolean => {
      try {
        const obj = JSON.parse(json);
        return predicate(obj);
      } catch (e) {
        return false;
      }
    },
  },

  [operands.EVALUATION.COMMON]: {
    [operators["COMMON"]["LOGICAL"]["AND"]]: (
      ...expressions: boolean[]
    ): boolean => expressions.every((expr) => expr === true),
    [operators["COMMON"]["LOGICAL"]["OR"]]: (
      ...expressions: boolean[]
    ): boolean => expressions.some((expr) => expr === true),
    [operators["COMMON"]["ASSERTION"]["ASSERT"]]: (a: boolean): boolean => a,
    [operators["COMMON"]["ASSERTION"]["ASSERT_NOT"]]: (a: boolean): boolean =>
      !a,
    [operators["COMMON"]["NULLISH"]["IS_EMPTY"]]: (
      a: string | any[],
    ): boolean => a.length === 0,
    [operators["COMMON"]["NULLISH"]["IS_NAN"]]: (a: number): boolean =>
      Number.isNaN(a),
    [operators["COMMON"]["NULLISH"]["IS_NULL"]]: (a: any): boolean =>
      a === null,
    [operators["COMMON"]["NULLISH"]["IS_UNDEFINED"]]: (a: any): boolean =>
      a === undefined,
    [operators["COMMON"]["NULLISH"]["EXISTS"]]: (a: any): boolean =>
      a !== undefined && a !== null,
  },
};

functions["COMMON"]["AND"](
  functions["STRING"]["CONTAINS"]("hello", "hello world"),
  functions["STRING"]["LENGTH_GREATER_THAN"]("hello world", 7),
);

// Factory Pattern
type OperandMap<T extends string> = {
  [K in T]: K;
};

// Operand factory function
function createOperands<T extends readonly string[]>(
  values: T,
): OperandMap<T[number]> {
  return values.reduce(
    (acc, key) => {
      acc[key as keyof OperandMap<T[number]>] = key;
      return acc;
    },
    {} as OperandMap<T[number]>,
  );
}

const someString = ["hello", "world"];

functions["COMMON"]["AND"](
  functions["ARRAY"]["CONTAINS"](someString, "hello"),
  functions["COMMON"]["ASSERT_NOT"](
    functions["ARRAY"]["CONTAINS"](someString, "world"),
  ),
);

const Verbosity = [
  "TRACE", // too much logs, highest level of verbosity. Discouraged to be used in production or staging even.
  "DEBUG", // Logs messages marked as DEBUG and all the below, Discouraged to be used in production, can be used in staging to analyze.
  "INFO", // Logs info messages and those below
  "WARN", // logs warning level messages and those below
  "ERROR", // only logs error messages
] as const;

export const ZRuleDefinitionSchema = z.string();

export const ZRuleSchema = z.object({
  type: z.enum([...RuleSchema]),
  description: z.string().nullable().optional(),
  definition: ZRuleDefinitionSchema,
  verbosity: z
    .enum([...Verbosity])
    .optional()
    .default("INFO"),
  shouldGatherMetrics: z.boolean().optional().default(true),
  isSystemDefined: z.boolean().optional().default(true),
  isInverse: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "should this condition be evaluated inversely? meaning, are you looking for a failing condition? if yes, set this to true",
    ),
});

export * from "./components/operands";
export * from "./operations";
