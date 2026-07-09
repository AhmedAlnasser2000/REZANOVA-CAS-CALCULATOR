# MATRIX-NULL-COLUMN-SPACE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

Passed:

- `npm test -- --run src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/navigation/menu.test.ts src/lib/app-state/history-schema.test.ts`
- `npm run test:file-sizes`

Blocked broad gate:

- `npx tsc -b --pretty false` is still blocked by unrelated `src/app/runtime/editorTargets.ts` MathLive selector/ref typing errors observed before this move.

## Coverage Notes

- Parser tests cover `\operatorname{null}(A)` and `\operatorname{col}(A)`.
- Dispatch tests cover `null(B)` and inline `col(...)` with exact sidecars.
- Matrix tests cover null-space basis, column-space basis, dimensions, rank-nullity facts, and zero-subspace readback.
- Navigation tests prove Matrix keypad overlay includes `null`/`col` while Vector/Calculate/derivative overlays do not inherit Matrix space keys.
