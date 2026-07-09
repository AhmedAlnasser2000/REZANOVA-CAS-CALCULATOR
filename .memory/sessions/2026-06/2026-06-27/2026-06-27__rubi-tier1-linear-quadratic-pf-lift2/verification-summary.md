# RUBI-TIER1-LINEAR-QUADRATIC-PF-LIFT2 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- label: backend

## Verification Evidence

- Focused probe for `\frac{x+1}{(x-2)(x^2+1)^3}` returned visible `partial-fractions` with `verified-exact` after raw rational verifier reduction; before the reducer, exact rational normalization stopped at `degree-limit` and the result fell back to numeric confidence.
- The focused rational-function plus integration suite passed in `5.10s`.
- The full four-file backend gate passed in `5.06s`.

## Verification Commands

- Passed: `npx vitest run src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/symbolic-engine/integration.test.ts --reporter verbose` (42 tests passed, duration 5.10s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` (68 tests passed, duration 5.06s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this Rubi PF lift milestone and required durable memory.
