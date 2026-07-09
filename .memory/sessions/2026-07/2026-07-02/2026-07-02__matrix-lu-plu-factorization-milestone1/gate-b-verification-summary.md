# MATRIX-LU-PLU-FACTORIZATION-MILESTONE1 Gate B Verification Summary

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

- `npm test -- --run src/lib/algebra/variable-hints.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/modes/matrix.test.ts src/lib/app-state/history-schema.test.ts src/lib/display/result/display-blocks.test.ts`
- `npx vitest run --config vitest.ui.config.ts src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Pending before commit:

- `git diff --cached --check`

## Coverage Notes

- Parser coverage verifies `\operatorname{plu}(A)` and `\operatorname{PLU}(A)`.
- Dispatch coverage verifies named PLU requests preserve matrix operands.
- Matrix operation coverage verifies `P A = L U`, permutation matrix readback, row-swap card, determinant sign, and singular pivot stops.
- Mode coverage verifies direct `plu(A)` titles and PLU detail cards.
- App-state coverage verifies `pluA` replay seed schema support.
- Variable-hint coverage verifies `plu(...)` does not produce fake Matrix parameter pills.
- UI-runtime coverage remains green for the shared Linear Algebra shell after operation additions.
- File-size ratchet initially caught `display-blocks.ts` growth; the gate fixed this by compacting the visible-title set without changing behavior or raising caps.
