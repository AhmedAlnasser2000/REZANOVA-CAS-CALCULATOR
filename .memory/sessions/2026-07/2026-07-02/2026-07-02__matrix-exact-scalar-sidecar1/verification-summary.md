# MATRIX-EXACT-SCALAR-SIDECAR1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

Passed:

- `npm test -- --run src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/linear-algebra/matrix-system.test.ts src/lib/app-state/history-schema.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Blocked broad gate:

- `npx tsc -b --pretty false` currently fails in pre-existing/unrelated `src/app/runtime/editorTargets.ts` MathLive selector/ref typing errors, outside the Matrix exact-sidecar slice.

## Coverage Notes

- Parser tests cover exact sidecars for integers, `\frac{}` entries, finite decimals, and negated `Ax+b=0` RHS vectors.
- Dispatch tests cover exact sidecars on inline Matrix operations and structured Matrix system RHS values.
- Matrix tests prove determinant and RREF consume exact sidecars while decimal grids without sidecars remain on the guarded numeric path.
- Structured system tests prove exact sidecars solve fraction/decimal systems exactly.
- App-state schema tests keep old numeric Matrix replay seeds loadable.
