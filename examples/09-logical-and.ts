import { InMemoryCompiledRuleStorageAdapter } from "../src/integrations";
import { createSemanticEngine, RuleInput } from "../src/semantic";

const run = async () => {
  // Step 1: Create storage and engine
  const storage = new InMemoryCompiledRuleStorageAdapter();
  const engine = await createSemanticEngine({ storage });

  // Step 2: Define the rule input (AND of two conditions)
  const ruleId = "logical-and-example";
  const ruleInput: RuleInput = {
    combinator: "AND",
    conditions: [
      {
        operand: "STRING",
        operator: "CONTAINS",
        subject: "candidate.email",
        reference: "aol.com",
      },
      {
        operand: "NUMBER",
        operator: "GREATER_THAN",
        subject: "candidate.experienceYears",
        reference: 3,
      },
    ],
  };

  // Step 3: Compile and store
  await engine.compileAndStore(ruleId, ruleInput, {
    rule_name: "Email contains and experience greater than",
  });

  // Step 4: Execute by ID
  const context = {
    candidate: { email: "dev@aol.com", experienceYears: 6 },
  };
  const result = await engine.executeById(ruleId, context);

  // Step 5: Inspect result
  console.log({ ruleId, result });
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
