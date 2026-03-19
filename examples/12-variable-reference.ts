import { InMemoryCompiledRuleStorageAdapter } from "../src/integrations";
import { createSemanticEngine, RuleInput } from "../src/semantic";

const run = async () => {
  // Step 1: Create storage and engine
  const storage = new InMemoryCompiledRuleStorageAdapter();
  const engine = await createSemanticEngine({ storage });

  // Step 2: Define rule input with referenceType="variable"
  const ruleId = "number-greater-than-variable-ref";
  const ruleInput: RuleInput = {
    operand: "NUMBER",
    operator: "GREATER_THAN",
    subject: "candidate.experienceYears",
    reference: "requirements.minYears",
    referenceType: "variable",
  };

  // Step 3: Compile and store
  await engine.compileAndStore(ruleId, ruleInput, {
    rule_name: "Experience greater than requirements.minYears",
  });

  // Step 4: Execute by ID
  const context = {
    candidate: { experienceYears: 6 },
    requirements: { minYears: 5 },
  };
  const result = await engine.executeById(ruleId, context);

  // Step 5: Inspect result
  console.log({ ruleId, result });
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
