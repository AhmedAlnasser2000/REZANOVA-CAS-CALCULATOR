# RUBI-TIER1-QUADRATIC-NUMERATOR-GENERAL1 Verification Summary

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

- Probe evidence before edits showed `(2x+3)/(x^2+2x+3)^4`, `(x+5)/(2x^2+4x+5)^3`, and `(2x+1)/(x^2+2x+3)^4` already resolved as visible `partial-fractions` with `verified-exact`; `(2x+2)/(x^2+2x+3)^4` resolved as visible `u-substitution` with `verified-exact`.
- Focused integration suite passed in `5.10s` after adding the hardening cases.
- Full four-file backend gate passed in `5.28s`.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose` (35 tests passed, duration 5.10s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` (69 tests passed, duration 5.28s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this hardening milestone and required durable memory.
