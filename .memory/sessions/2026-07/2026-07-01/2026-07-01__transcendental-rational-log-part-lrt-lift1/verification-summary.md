# TRANSCENDENTAL-RATIONAL-LOG-PART-LRT-LIFT1 Verification Summary

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
- backend

## Commands
- `npx vitest run src/lib/symbolic-engine/integration-transcendental-lrt-log-part-lift.test.ts src/lib/symbolic-engine/integration-risch-norman-lrt-log-part.test.ts src/lib/symbolic-engine/primitives/symbolic-polynomial.test.ts`
  - Passed: 3 files, 18 tests.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Passed: 3 files, 97 tests.
- `npx tsc -b --pretty false`
  - Passed.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --check`
  - Passed.
- `node tools/validate-file-sizes.mjs`
  - Blocked in the shared worktree by active unrelated dirty files: `src/app/runtime/useCalculusRuntime.ts`, `src/lib/display/result/display-blocks.ts`, and `src/types/calculator/runtime-types.ts`. None are part of this milestone's staged scope.

## Evidence
- Direct LRT lift tests prove exact quartic residuals and target-free symbolic numerators can produce named-root logarithmic evidence under descriptor cap `8`.
- Live RN LRT dispatch remains on the old default cap; `1/(x^4+x+1)` still stops in the live default route until the planned orchestrator milestone.
- The symbolic-polynomial primitive now skips structural zero cofactors during determinant expansion, preserving existing default dimension caps.
