/**
 * What: Lowering utilities from normalized DSL to canonical AST/IR.
 * Why: Persists machine-oriented, deterministic, registry-backed representation.
 * How to use:
 * `const ir = lowerDslToCanonicalIr(rule, registry);`
 */
import { SemanticRegistry } from "./registry";
import {
  CanonicalAstIr,
  CanonicalNode,
  CanonicalValueRef,
  UniversalDslNode,
  UniversalDslRule,
  UniversalValueRef,
} from "./types";

class InternPool<T> {
  private readonly values: T[] = [];
  private readonly lookup = new Map<string, number>();

  public add(value: T, stableKey: string): number {
    const existing = this.lookup.get(stableKey);
    if (existing !== undefined) {
      return existing;
    }
    const index = this.values.length;
    this.values.push(value);
    this.lookup.set(stableKey, index);
    return index;
  }

  public list(): T[] {
    return [...this.values];
  }
}

const toRef = (
  value: UniversalValueRef,
  symbolPool: InternPool<string>,
  literalPool: InternPool<unknown>,
): CanonicalValueRef => {
  if (value.type === "path") {
    return {
      kind: "symbol",
      index: symbolPool.add(value.value, value.value),
    };
  }

  const literalKey = JSON.stringify(value.value);
  return {
    kind: "literal",
    index: literalPool.add(value.value, literalKey),
  };
};

export const lowerDslToCanonicalIr = (
  rule: UniversalDslRule,
  registry: SemanticRegistry,
): CanonicalAstIr => {
  const symbolPool = new InternPool<string>();
  const literalPool = new InternPool<unknown>();
  const nodes: CanonicalNode[] = [];

  const lowerNode = (node: UniversalDslNode): number => {
    if (node.nodeType === "logical") {
      const logicalOperator = registry.getOperator("COMMON", node.operatorKey);
      if (!logicalOperator) {
        throw new Error(`Missing logical operator in registry: ${node.operatorKey}`);
      }

      const childNodeIndexes = node.children.map((child) => lowerNode(child));
      const nextIndex = nodes.length;
      nodes.push({
        kind: "logical",
        operatorId: logicalOperator.id,
        childNodeIndexes,
      });
      return nextIndex;
    }

    const operand = registry.getOperand(node.operandKey);
    if (!operand) {
      throw new Error(`Missing operand in registry: ${node.operandKey}`);
    }

    const operator = registry.getOperator(node.operandKey, node.operatorKey);
    if (!operator) {
      throw new Error(
        `Missing operator in registry: ${node.operandKey}:${node.operatorKey}`,
      );
    }

    const ruleCategory = registry.getRuleCategoryById(operand.ruleCategoryId);
    if (!ruleCategory) {
      throw new Error(
        `Missing rule category for operand ${node.operandKey}:${operand.ruleCategoryId}`,
      );
    }

    const subjectRef = toRef(node.subject, symbolPool, literalPool);
    const referenceRef =
      node.reference === undefined
        ? undefined
        : toRef(node.reference, symbolPool, literalPool);

    const nextIndex = nodes.length;
    nodes.push({
      kind: "comparison",
      ruleCategoryId: ruleCategory.id,
      operandId: operand.id,
      operatorId: operator.id,
      subjectRef,
      referenceRef,
    });
    return nextIndex;
  };

  const rootNodeIndex = lowerNode(rule.root);

  return {
    astVersion: 1,
    symbolTable: symbolPool.list(),
    literalPool: literalPool.list(),
    nodes,
    rootNodeIndex,
  };
};
