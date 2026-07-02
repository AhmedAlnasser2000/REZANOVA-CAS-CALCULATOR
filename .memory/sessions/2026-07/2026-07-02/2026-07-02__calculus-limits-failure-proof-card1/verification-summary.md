## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

- Commit subject: `CALCULUS-LIMITS-FAILURE-PROOF-CARD1`
- `npm run test:unit -- src/lib/calculus/workspace/limits.test.ts src/lib/calculus/engine/core.test.ts` passed.
- `npm run test:ui -- src/app/workspaces/CalculusLimitEditorSource.ui.test.tsx` passed.
- `npx tsc -b --pretty false` passed.

## Evidence

- Unit tests verify `lim x -> 0 1/x` produces `Why This Limit Fails` with `-\infty`, `\infty`, and the two-sided nonexistence conclusion.
- UI test verifies the error plus proof detail card appears on the guided Limit screen.
- A broader exploratory `math-engine/calculus.test.ts` run was not used as this gate because unrelated dirty integration work affected an integration expectation.
