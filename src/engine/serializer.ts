/**
 * What: JSON serializer/deserializer for rule AST.
 * Why: Enables storage and transport of parsed rule definitions.
 * How to use:
 * `const raw = serializer.serialize(ast); const ast2 = serializer.deserialize(raw);`
 */
import { Serializer } from "../core/contracts";
import { RuleOperationNode } from "../types/rules/operations";

export class JsonRuleSerializer
  implements Serializer<RuleOperationNode, string>
{
  public serialize(value: RuleOperationNode): string {
    return JSON.stringify(value);
  }

  public deserialize(payload: string): RuleOperationNode {
    return JSON.parse(payload) as RuleOperationNode;
  }
}
