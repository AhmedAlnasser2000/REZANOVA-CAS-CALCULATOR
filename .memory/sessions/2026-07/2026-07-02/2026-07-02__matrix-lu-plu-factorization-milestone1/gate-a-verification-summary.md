# MATRIX-LU-PLU-FACTORIZATION-MILESTONE1 Gate A Verification Summary

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

- `npm test -- --run src/lib/algebra/variable-hints.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/modes/matrix.test.ts src/lib/app-state/history-schema.test.ts src/lib/display/result/display-blocks.test.ts`
- `npx vitest run --config vitest.ui.config.ts src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Pending before commit:

- `git diff --cached --check`

## Coverage Notes

- Parser coverage verifies `\operatorname{lu}(A)` and `\operatorname{LU}(A)`.
- Dispatch coverage verifies named and inline LU requests preserve exact matrix sidecars.
- Matrix operation coverage verifies exact `A=LU`, `L`/`U` cards, determinant reuse, and row-swap-needed stops.
- Mode coverage verifies direct `lu(A)` titles and LU detail cards.
- App-state coverage verifies `luA` replay seed schema support.
- Variable-hint coverage verifies `lu(...)` does not produce fake Matrix parameter pills.
- UI-runtime coverage remains green for the shared Linear Algebra shell after operation additions.
