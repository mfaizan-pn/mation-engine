import { InMemoryCompiledRuleStorageAdapter } from "../src/integrations";
import { createSemanticEngine, RuleInput } from "../src/semantic";

const run = async () => {
  // Step 1: Create storage and engine
  const storage = new InMemoryCompiledRuleStorageAdapter();
  const engine = await createSemanticEngine({ storage });

  // Step 2: Define the rule input (nested AND/OR)
  const ruleId = "nested-groups-example";
  const ruleInput: RuleInput = {
    combinator: "OR",
    conditions: [
      {
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
            reference: 2,
          },
        ],
      },
      {
        operand: "NUMBER",
        operator: "GREATER_THAN",
        subject: "candidate.experienceYears",
        reference: 5,
      },
    ],
  };

  // Step 3: Compile and store
  await engine.compileAndStore(ruleId, ruleInput, {
    rule_name: "Nested OR/AND example",
  });

  // Step 4: Execute by ID
  const context = {
    candidate: { email: "dev@aol.com", experienceYears: 3 },
  };
  const result = await engine.executeById(ruleId, context);

  // Step 5: Inspect result
  console.log({ ruleId, result });
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
