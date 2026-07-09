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
- milestone: `ALGEBRAIC-GENUS0-INVERSE-READBACK1`

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus0-inverse-readback.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-pullback.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-parametrization.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-profile.test.ts src/lib/symbolic-engine/differentiation.test.ts`
  - passed: 6 files, 41 tests.
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

The milestone is direct-test only and touched algebraic-genus0 readback substrate/tests, a small readback grouping helper, profiler stop coverage, and durable memory.
