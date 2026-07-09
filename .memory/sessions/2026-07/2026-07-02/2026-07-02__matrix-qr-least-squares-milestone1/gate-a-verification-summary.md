# MATRIX-QR-LEAST-SQUARES-MILESTONE1 Gate A Verification Summary

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

- `npm test -- --run src/lib/algebra/variable-hints.test.ts src/lib/navigation/menu.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/modes/matrix.test.ts src/lib/app-state/history-schema.test.ts`
- `npx vitest run --config vitest.ui.config.ts src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Coverage Notes

- Matrix runtime coverage verifies `A=QR`, exact `Q`, exact `R`, `Q^{T}Q=I`, `QR=A`, and column-step readback for `[[3,0],[4,5]]`.
- Matrix runtime coverage verifies the controlled non-rational norm stop for `[[1,0],[1,1]]`.
- Parser and dispatch coverage verifies inline `\operatorname{qr}` parsing, exact sidecars, and `qrA` request construction.
- UI-runtime coverage verifies the Matrix editor path returns `QR Factors`, `QR Proof`, and `QR Column Steps`.
- Keypad coverage verifies the Matrix overlay exposes `qr(...)` and Vector does not.
