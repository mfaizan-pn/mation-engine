import { InMemoryCompiledRuleStorageAdapter } from "../src/integrations";
import { createSemanticEngine, RuleInput } from "../src/semantic";

const run = async () => {
  // Step 1: Create storage and engine
  const storage = new InMemoryCompiledRuleStorageAdapter();
  const engine = await createSemanticEngine({ storage });

  // Step 2: Define the rule input (OR of two conditions)
  const ruleId = "logical-or-example";
  const ruleInput: RuleInput = {
    combinator: "OR",
    conditions: [
      {
        operand: "STRING",
        operator: "ENDS_WITH",
        subject: "candidate.email",
        reference: "@company.com",
      },
      {
        operand: "COMMON",
        operator: "EXISTS",
        subject: "candidate.resume",
      },
    ],
  };

  // Step 3: Compile and store
  await engine.compileAndStore(ruleId, ruleInput, {
    rule_name: "Email ends with or resume exists",
  });

  // Step 4: Execute by ID
  const context = {
    candidate: { email: "dev@aol.com", resume: { source: "upload" } },
  };
  const result = await engine.executeById(ruleId, context);

  // Step 5: Inspect result
  console.log({ ruleId, result });
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
