/**
 * What: Typed HTTP client for rule-engine API endpoints.
 * Why: Lets you register and execute rules without direct engine embedding.
 * How to use:
 * `const client = new RuleEngineHttpClient("http://localhost:3000");`
 */
import { RuleInput, StoredRuleInput } from "../engine";
import {
  ConditionDefinition,
  OperandDefinition,
  OperatorDefinition,
} from "../repositories";

export type FunctionPreset =
  | "STRING_CONTAINS"
  | "STRING_ENDS_WITH"
  | "NUMBER_GREATER_THAN"
  | "COMMON_EXISTS";

export interface RegisterFunctionPayload {
  key: string;
  operand: string;
  operator: string;
  preset: FunctionPreset;
}

export class RuleEngineHttpClient {
  public constructor(private readonly baseUrl: string) {}

  public async registerOperand(payload: OperandDefinition): Promise<void> {
    await this.post("/operands/register", payload);
  }

  public async registerOperator(payload: OperatorDefinition): Promise<void> {
    await this.post("/operators/register", payload);
  }

  public async registerFunction(
    payload: RegisterFunctionPayload,
  ): Promise<void> {
    await this.post("/functions/register", payload);
  }

  public async registerRule(
    payload: StoredRuleInput,
  ): Promise<ConditionDefinition> {
    const response = await this.post<{ rule: ConditionDefinition }>(
      "/rules/register",
      payload,
    );
    return response.rule;
  }

  public async listRules(): Promise<ReadonlyArray<ConditionDefinition>> {
    const response = await this.get<{ rules: ConditionDefinition[] }>("/rules");
    return response.rules;
  }

  public async getRule(id: string): Promise<ConditionDefinition> {
    const response = await this.get<{ rule: ConditionDefinition }>(
      `/rules/${id}`,
    );
    return response.rule;
  }

  public async removeRule(id: string): Promise<void> {
    await this.delete(`/rules/${id}`);
  }

  public async execute(input: RuleInput, context: Record<string, unknown>) {
    const response = await this.post<{ output: unknown }>("/rules/execute", {
      input,
      context,
    });
    return response.output;
  }

  public async executeStored(id: string, context: Record<string, unknown>) {
    const response = await this.post<{ output: unknown }>(
      `/rules/${id}/execute`,
      {
        context,
      },
    );
    return response.output;
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    return await this.parseResponse<T>(response);
  }

  private async post<T = { ok: boolean }>(
    path: string,
    body: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await this.parseResponse<T>(response);
  }

  private async delete<T = { ok: boolean }>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
    });
    return await this.parseResponse<T>(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const data = (await response.json()) as T;
    if (!response.ok) {
      const errorData = data as { message?: string };
      const message = errorData.message ?? "Request failed";
      throw new Error(message);
    }
    return data;
  }
}
