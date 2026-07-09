# RUBI-TIER1-AFFINE-LOG-BYPARTS1 Verification Summary

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

## Evidence

- Verified `x ln(2x+3)` resolves through visible `integration-by-parts` with `verified-exact` backcheck.
- Verified `(x+1)^2 ln(2x+3)` resolves through the expanded by-parts feeder with exact original-integrand backcheck.
- Verified `x log(2x+3)` resolves through visible `integration-by-parts` with derivative-backcheck confidence and explicit `ln(10)` denominator.
- Preserved existing expanded by-parts support for polynomial times exponential, trig, and `ln(x)` cases.
- The full backend suite now shows `handles bounded rational partial-fraction primitives` as the dominant runtime block; this is verification/test cost, not classifier route-search behavior.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts -t "integration-by-parts"` (1 file passed, 3 tests passed, 12 skipped, duration 3.43s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` (4 files passed, 49 tests passed, duration 246.65s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this backend milestone and required durable memory.
