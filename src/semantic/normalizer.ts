/**
 * What: Semantic normalizer for deterministic canonicalization.
 * Why: Produces stable canonical form for hashing and storage equivalence.
 * How to use:
 * `const normalized = normalizeDsl(rule);`
 */
import { UniversalDslLogicalNode, UniversalDslNode, UniversalDslRule } from "./types";

const stableNodeString = (node: UniversalDslNode): string =>
  JSON.stringify(node);

const normalizeNode = (node: UniversalDslNode): UniversalDslNode => {
  if (node.nodeType !== "logical") {
    return node;
  }

  const normalizedChildren = node.children.map((child) => normalizeNode(child));
  const flattened: UniversalDslNode[] = [];

  for (const child of normalizedChildren) {
    if (child.nodeType === "logical" && child.operatorKey === node.operatorKey) {
      flattened.push(...child.children);
    } else {
      flattened.push(child);
    }
  }

  const sorted = [...flattened].sort((left, right) =>
    stableNodeString(left).localeCompare(stableNodeString(right)),
  );

  const normalizedNode: UniversalDslLogicalNode = {
    nodeType: "logical",
    operatorKey: node.operatorKey,
    children: sorted,
  };
  return normalizedNode;
};

export const normalizeDsl = (rule: UniversalDslRule): UniversalDslRule => ({
  ...rule,
  root: normalizeNode(rule.root),
});
