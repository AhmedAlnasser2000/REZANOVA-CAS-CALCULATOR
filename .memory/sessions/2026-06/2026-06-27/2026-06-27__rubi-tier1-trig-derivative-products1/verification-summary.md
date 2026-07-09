# RUBI-TIER1-TRIG-DERIVATIVE-PRODUCTS1 Verification Summary

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

- `sec(2x+3)tan(2x+3)` and reversed factor order resolve as visible `u-substitution` with `verified-exact` backcheck.
- `5 sec(2x+3)tan(2x+3)`, `csc(2x+3)cot(2x+3)`, and `sin(2x+1)cos(2x+1)` resolve as visible `u-substitution` with `verified-exact` backcheck.
- `x sec(x)tan(x)` remains an error and is not claimed as `u-substitution`.
- Full focused backend gate passed with 4 files and 83 tests in about `5.37s`.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose` (49 tests passed, duration 5.18s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` (83 tests passed, duration 5.37s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction.
- Staged diff should include only this trig derivative-product milestone and its durable memory record.
