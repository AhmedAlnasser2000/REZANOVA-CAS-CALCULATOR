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
- milestone: `ALGEBRAIC-GENUS0-SYMBOLIC-FACTS1`

## Verification

- `npx vitest run src/lib/symbolic-engine/integration-algebraic-genus0-facts.test.ts src/lib/symbolic-engine/integration-algebraic-genus0-profile.test.ts`
  - passed: 2 files, 11 tests.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - passed: 3 files, 97 tests.
- `npm run test:memory-protocol`
  - passed.
- `git diff --check`
  - passed.

## Blocked Unrelated Gates

- `npx tsc -b --pretty false`
  - blocked by unrelated linear-algebra errors:
    - `src/lib/linear-algebra/exact-matrix-format.ts(1,28): Module "./exact-matrix-core" declares ExactScalar locally, but it is not exported.`
    - `src/lib/linear-algebra/matrix.ts(135,68): MatrixRequest is not assignable to NumericMatrixRequest because operation "linearSystem" is not a NumericMatrixOperation.`
- `node tools/validate-file-sizes.mjs`
  - blocked by unrelated file-size ratchet:
    - `src/types/calculator/runtime-types.ts has 1346 lines, exceeding its cap of 1341.`

## Notes

The milestone touched only algebraic-genus0 integration test/substrate files plus required durable memory.
