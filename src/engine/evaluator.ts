/**
 * What: AST evaluator with short-circuit group logic.
 * Why: Executes validated rules against runtime context efficiently.
 * How to use:
 * `const out = evaluator.evaluate(ast, context); // { result, trace }`
 */
import { EvaluationResult, RuleEvaluator } from "../core/contracts";
import {
  FunctionRepository,
  functionRepositoryKeyByParts,
} from "../repositories";
import {
  isVariableOperand,
  OperandNode,
} from "../types/rules/components/operands";
import { RuleOperationNode } from "../types/rules/operations";
import { EvaluationTraceEntry } from "./types";
import { DotPathVariableResolver } from "./variableResolver";

export class EngineRuleEvaluator<TContext extends Record<string, unknown>>
  implements
    RuleEvaluator<
      RuleOperationNode,
      TContext,
      boolean,
      ReadonlyArray<EvaluationTraceEntry>
    >
{
  public constructor(
    private readonly functions: FunctionRepository,
    private readonly resolver: DotPathVariableResolver<TContext>,
  ) {}

  public evaluate(
    ast: RuleOperationNode,
    context: TContext,
  ): EvaluationResult<boolean, ReadonlyArray<EvaluationTraceEntry>> {
    const trace: EvaluationTraceEntry[] = [];
    const result = this.evaluateNode(ast, context, trace);
    return {
      result,
      trace,
    };
  }

  private evaluateNode(
    node: RuleOperationNode,
    context: TContext,
    trace: EvaluationTraceEntry[],
  ): boolean {
    if (node.kind === "group") {
      const groupResult =
        node.combinator === "AND"
          ? this.evaluateAndGroup(node.children, context, trace)
          : this.evaluateOrGroup(node.children, context, trace);

      trace.push({
        node: "group",
        operator: node.combinator,
        result: groupResult,
      });

      return groupResult;
    }

    const functionKey = functionRepositoryKeyByParts(
      node.operand,
      node.operator,
    );
    const implementation = this.functions.get(functionKey);

    if (!implementation) {
      trace.push({
        node: node.kind,
        operand: node.operand,
        operator: node.operator,
        result: false,
      });
      return false;
    }

    const result =
      node.kind === "unary"
        ? Boolean(
            implementation.signature(
              this.resolveOperandValue(node.argument, context),
            ),
          )
        : Boolean(
            implementation.signature(
              this.resolveOperandValue(node.left, context),
              this.resolveOperandValue(node.right, context),
            ),
          );

    trace.push({
      node: node.kind,
      operand: node.operand,
      operator: node.operator,
      result,
    });

    return result;
  }

  private evaluateAndGroup(
    children: ReadonlyArray<RuleOperationNode>,
    context: TContext,
    trace: EvaluationTraceEntry[],
  ): boolean {
    for (const child of children) {
      if (!this.evaluateNode(child, context, trace)) {
        return false;
      }
    }
    return true;
  }

  private evaluateOrGroup(
    children: ReadonlyArray<RuleOperationNode>,
    context: TContext,
    trace: EvaluationTraceEntry[],
  ): boolean {
    for (const child of children) {
      if (this.evaluateNode(child, context, trace)) {
        return true;
      }
    }
    return false;
  }

  private resolveOperandValue(
    operand: OperandNode,
    context: TContext,
  ): unknown {
    if (isVariableOperand(operand)) {
      return this.resolver.resolve(operand.path, context);
    }

    return operand.value;
  }
}
