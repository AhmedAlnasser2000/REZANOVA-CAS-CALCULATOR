# MATRIX-QR-LEAST-SQUARES-MILESTONE1 Gate C Verification Summary

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

- Matrix runtime coverage verifies `ls(A,[2,3,4])` for `A=[[1,0],[0,1],[0,0]]` gives `x_LS=[2,3]`.
- Result-card coverage verifies fitted vector `[2,3,0]`, residual `[0,0,4]`, `||r||^2=16`, and proof zero readback.
- Dispatch coverage verifies `ls(A, inline vector)` creates a `leastSquaresA` request with exact RHS sidecars.
- Parser coverage verifies `ls(...)` editor expressions parse as Matrix least-squares expressions.
- UI-runtime coverage verifies the Matrix editor returns `Least-Squares Solution`, `Residual Vector`, and `Least-Squares Proof`.
- Keypad coverage verifies the Matrix QR key has a shifted `ls(...)` insertion.
- Variable-hint coverage verifies `ls(...)` does not produce a false variable/function hint.
