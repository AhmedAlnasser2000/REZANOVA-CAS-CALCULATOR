# RUBI-TIER1-TRIG-PRODUCT-TO-SUM-LIFT1 Verification Summary

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

- Focused tests cover scalar product-to-sum `3 sin(2x)cos(5x)`, reordered `cos(3x)sin(2x)`, existing `sin*sin` and `cos*cos` cases, symbolic scalar rejection, and broader three-factor trig rejection.
- Accepted cases keep visible `direct-rule` and `verified-exact` backcheck through the scoped trig-product identity normalizer.

## Verification Commands

- Passed: `npx vitest run src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/symbolic-engine/integration.test.ts` (2 files, 68 tests)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (4 files, 94 tests)
- Native worktree blocked: `npx tsc -b --pretty false` failed on unrelated dirty Display lane `src/app/shell/display-panel/DisplayResultBlocks.tsx` unused `useEffect`.
- Passed: isolated clean-worktree `npx tsc -b --pretty false` with only this milestone's calculus/integration diff applied.
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`
- Passed: `git diff --cached --check`.
