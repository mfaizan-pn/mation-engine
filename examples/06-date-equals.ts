import { InMemoryCompiledRuleStorageAdapter } from "../src/integrations";
import { createSemanticEngine, RuleInput } from "../src/semantic";

const run = async () => {
  // Step 1: Create storage and engine
  const storage = new InMemoryCompiledRuleStorageAdapter();
  const engine = await createSemanticEngine({ storage });

  // Step 2: Define the rule input (DATE.EQUALS)
  const ruleId = "date-equals-last-contact";
  const ruleInput: RuleInput = {
    operand: "DATE",
    operator: "EQUALS",
    subject: "company.last_contacted_at",
    reference: "2026-03-12T05:30:36.599Z",
  };

  // Step 3: Compile and store
  await engine.compileAndStore(ruleId, ruleInput, {
    rule_name: "Last contacted equals timestamp",
  });

  // Step 4: Execute by ID
  const context = {
    company: { last_contacted_at: "2026-03-12T05:30:36.599Z" },
  };
  const result = await engine.executeById(ruleId, context);

  // Step 5: Inspect result
  console.log({ ruleId, result });
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
