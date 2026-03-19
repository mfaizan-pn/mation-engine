# Examples

Each example is a runnable script that shows:

1. Create storage and engine.
2. Define the rule (step-by-step object).
3. Compile and store the rule.
4. Execute by ID with a context.
5. Print the result.

Run any example from repo root:

```bash
node -r ts-node/register examples/01-string-contains.ts
```

All examples use `InMemoryCompiledRuleStorageAdapter` to keep them self-contained.
