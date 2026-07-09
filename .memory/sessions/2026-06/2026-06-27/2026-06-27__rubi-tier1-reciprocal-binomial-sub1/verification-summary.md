# RUBI-TIER1-RECIPROCAL-BINOMIAL-SUB1 Verification Summary

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

- Verified `x^{-3}(1+x^{-2})^2` resolves through visible `u-substitution` with `verified-exact` backcheck.
- Verified `x^{-3}/(1+x^{-2})` resolves through visible `u-substitution` with logarithmic `p=-1` output.
- Verified exact-rational coefficient and reciprocal-power case `2x^{-3}(3+1/2*x^{-2})^{-2}`.
- Verified `n=1` reciprocal case `x^{-2}(1+x^{-1})^{-1}` after supporting exact monomial denominators in the scoped Laurent parser.
- Verified a missing reciprocal derivative factor is not claimed by `u-substitution`; it may fall through to pre-existing rational routes.
- The full backend suite again shows `handles bounded rational partial-fraction primitives` as the dominant runtime block, confirming the long integration suite time is verification/test cost in rational partial fractions rather than classifier route-search overhead.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts -t "binomial substitution"` (1 file passed, 2 tests passed, 13 skipped, duration 6.17s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` (4 files passed, 49 tests passed, duration 254.84s)
- Passed: `npm run test:source-mirrors`
- Passed: `git diff --check`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this backend milestone and required durable memory.
