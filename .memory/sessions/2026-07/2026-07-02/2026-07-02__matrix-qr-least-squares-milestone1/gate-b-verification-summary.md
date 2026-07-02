# MATRIX-QR-LEAST-SQUARES-MILESTONE1 Gate B Verification Summary

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

- `npm test -- --run src/lib/algebra/variable-hints.test.ts src/lib/navigation/menu.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/modes/matrix.test.ts src/lib/app-state/history-schema.test.ts`
- `npx vitest run --config vitest.ui.config.ts src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Coverage Notes

- Matrix runtime coverage verifies projection of `[2,3,4]` onto `Col([[1,0],[0,1],[0,0]])` gives `[2,3,0]`.
- Proof-card coverage verifies `Q^Tb`, residual `[0,0,4]`, and `Q^T` residual zero readback.
- Dispatch coverage verifies `projcol(A, inline vector)` creates a `columnProjectionA` request with exact RHS sidecars.
- UI-runtime coverage verifies the Matrix editor returns `Column Projection Facts` and `Column Projection Proof`.
- Keypad coverage verifies `col` has a shifted `projcol(...)` insertion and Vector does not expose the Matrix QR/projection keys.
