# RUBI-TIER1-TRIG-PRODUCT-TO-SUM1 Verification Summary

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

- `sin(2x)cos(3x)`, `sin(2x+1)sin(3x-2)`, and `cos(2x)cos(3x)` resolve as visible `direct-rule` with `verified-exact` backcheck.
- `sin(x)cos(x)tan(x)` remains a controlled unsupported broader trig-product case and is not claimed by the new direct rule.
- Focused direct/integration tests passed with 2 files and 60 tests in about `5.46s`.
- Full backend gate passed with 5 files and 94 tests in about `5.58s`.

## Verification Commands

- Passed: `npx vitest run src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/symbolic-engine/integration.test.ts --reporter verbose` (60 tests passed, duration 5.46s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (94 tests passed, duration 5.58s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction after the full gate passed.
- Staged diff should include only this trig product-to-sum milestone and its durable memory record.
