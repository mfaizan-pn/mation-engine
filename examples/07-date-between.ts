import { InMemoryCompiledRuleStorageAdapter } from "../src/integrations";
import { createSemanticEngine, RuleInput } from "../src/semantic";

const run = async () => {
  // Step 1: Create storage and engine
  const storage = new InMemoryCompiledRuleStorageAdapter();
  const engine = await createSemanticEngine({ storage });

  // Step 2: Define the rule input (DATE.BETWEEN)
  const ruleId = "date-between-range";
  const ruleInput: RuleInput = {
    operand: "DATE",
    operator: "BETWEEN",
    subject: "candidate.appliedAt",
    reference: {
      start: "2026-03-01T00:00:00.000Z",
      end: "2026-03-31T23:59:59.999Z",
    },
  };

  // Step 3: Compile and store
  await engine.compileAndStore(ruleId, ruleInput, {
    rule_name: "Applied date between range",
  });

  // Step 4: Execute by ID
  const context = {
    candidate: { appliedAt: "2026-03-12T05:30:36.599Z" },
  };
  const result = await engine.executeById(ruleId, context);

  // Step 5: Inspect result
  console.log({ ruleId, result });
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
