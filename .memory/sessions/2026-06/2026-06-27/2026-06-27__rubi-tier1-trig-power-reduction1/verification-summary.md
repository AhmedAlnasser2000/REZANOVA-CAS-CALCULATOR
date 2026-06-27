# RUBI-TIER1-TRIG-POWER-REDUCTION1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend

## Verification Evidence

- `sin(x)^2`, `cos(2x+3)^2`, `tan(x)^2`, and `cot(2x+3)^2` resolve as visible `direct-rule` with `verified-exact` backcheck.
- `sin(x)^3` remains a controlled unsupported trig-power case and is not claimed by the new direct square slice.
- File-size ratchet initially caught `verification.ts` growth; the trig-square identity proof helper was extracted to `trig-square-equivalence.ts`, and the file-size gate then passed.
- Focused trig-square tests remain around `5.28s`, preserving the rational partial-fractions performance recovery.
- Full backend gate passed with 5 files and 90 tests in about `5.52s`.

## Verification Commands

- Passed: `npx vitest run src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/symbolic-engine/integration.test.ts --reporter verbose` (56 tests passed, duration 5.28s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (90 tests passed, duration 5.52s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction after the full gate passed.
- Staged diff should include only this trig power-reduction milestone and its durable memory record.
