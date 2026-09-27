# Matrix and Vector Core Combinations - Verification

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Backend Gate

- `npx tsc -b --pretty false`, `npm run build`, focused Linear Algebra Vitest, `npm run test:file-sizes`, `npm run test:memory-protocol`, `npm run test:ooe-boundaries`, and `npm run test:compartments-boundaries` passed.
- `npm run test:result-contract` passed 146 tests, and `npm run test:mathjson-coverage` passed four tests. The e2e TypeScript configuration type-checks.
- Exact/symbolic combinations, scalar and Matrix division, Matrix by inline Vector, workspace-local names, invalid operands, dimension mismatch, and existing editing cap have focused coverage.
- Full unit suite passed: 641 files, 4,470 tests. Full UI suite passed: 85 files, 607 tests with four existing skips. The MathLive UI mock now emits the same native input event as real insertion.

## UI Gate

- Headed system Chrome Playwright: native right-click Insert Matrix through the size grid retained the second and third 3 by 3 matrices when the first cell was typed. Two inline column Vectors likewise retained their first entries. Matrix `2A-B`, Vector `unit(u+v)`, and Calculate inline Matrix times Vector visibly returned answers. No page exceptions were observed.
- The checked-in `e2e/matrix-vector-typed-editor.spec.ts` passed both tests in headed Chrome against the production build.
- Same-machine headed edit-to-double-paint samples (20 per case): baseline three 3 by 3 matrices p95 32.4 ms, changed p95 31.3 ms; baseline 8 by 8 p95 37.1 ms, changed p95 36.7 ms. Both are under the 150 ms target. The small difference does not establish a performance improvement.
- Screenshots and benchmark script are in ignored `.task_tmp/matrix-vector-core-combinations/` for local review.

## Integration Boundary

- This lane is isolated in `/home/ahmed/Documents/Calculator-matrix-vector-core` on `codex/matrix-vector-core-combinations`. No commit or push has been made, and no shared-checkout Graphing or integration files were changed.
