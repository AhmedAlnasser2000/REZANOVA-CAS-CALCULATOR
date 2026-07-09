# RUBI-TIER1-EXP-AFFINE-BASIC1 Verification Summary

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

- Probe evidence showed `2^(2x+3)` and `(1/2)^(3x-1)` resolve as visible `direct-rule` with `verified-exact` backcheck.
- Probe evidence showed `e^((1/2)x+1)` remains successful with `verified-exact` backcheck.
- Probe evidence showed zero, negative, and symbolic bases remain controlled unsupported stops.
- Differentiation metadata for `(1/2)^(3x-1)` now stays native `general-power` without Compute Engine fallback.
- Full backend Rubi/calculus gate passed with 6 files and 92 tests in about `5.38s`.

## Verification Commands

- Passed: `npx vitest run src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/integration.test.ts --reporter verbose` (58 tests passed, duration 5.43s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/symbolic-engine/differentiation.test.ts` (92 tests passed, duration 5.38s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this exponential affine milestone and required durable memory.
