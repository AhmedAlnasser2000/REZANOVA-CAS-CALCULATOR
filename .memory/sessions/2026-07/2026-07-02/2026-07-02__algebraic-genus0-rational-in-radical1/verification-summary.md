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
- milestone: `ALGEBRAIC-GENUS0-RATIONAL-IN-RADICAL1`

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus0-rational-in-radical.test.ts`
  - passed: 1 file, 6 tests.
- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus0-rational-in-radical.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-standard-radicals.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-inverse-readback.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-pullback.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-parametrization.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-profile.test.ts`
  - passed: 7 files, 37 tests.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - passed: 3 files, 97 tests.
- `npx tsc -b --pretty false`
  - passed.
- `node tools/validate-file-sizes.mjs`
  - passed.
- `npm run test:memory-protocol`
  - passed.
- `git diff --check`
  - passed.

## Notes

The first focused test run exposed an accidental slow path where the adapter re-entered full pullback integration to build standard primitive pieces. The implementation was revised to build the closed-form primitive nodes directly from standard quadratic evidence; the focused test file then completed in under one second.
