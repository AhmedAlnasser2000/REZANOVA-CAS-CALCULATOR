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

- Commit subject: `CALCULUS-LIMITS-SIDE-BEHAVIOR-EXPLANATION1`
- `npm run test:unit -- src/lib/calculus/workspace/limits.test.ts src/lib/calculus/engine/core.test.ts` passed.
- `npm run test:ui -- src/app/workspaces/CalculusLimitEditorSource.ui.test.tsx` passed.
- `npx tsc -b --pretty false` passed.

## Evidence

- Tests cover `lim x -> 0+ 1/x`, `lim x -> 0- 1/x`, `lim x -> 0 1/x^2`, and unstable `lim x -> 0 sin(1/x)`.
- Detail cards stay separate from the Answer card.
