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

- Commit subject: `CALCULUS-LIMITS-PARSER-FRIENDLINESS1`
- `npm run test:unit -- src/lib/calculus/limit-request.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/workspace/engine.test.ts` passed.
- `npx tsc -b --pretty false` passed.

## Evidence

- Parser tests cover `infinity`, `infinty`, `infty`, `∞`, `+∞`, `+\infty`, `-∞`, and `-\infty`.
- Workspace tests verify `lim x -> infinity (3t^2+1)/(2t^2-5)` stops with a correction suggestion and no exact answer.
- Stored-value test verifies the mismatch stop happens before `t` can be substituted.
