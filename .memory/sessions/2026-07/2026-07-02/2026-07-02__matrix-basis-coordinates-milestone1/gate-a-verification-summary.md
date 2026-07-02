# MATRIX-BASIS-COORDINATES-MILESTONE1 Gate A Verification Summary

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

- `npm test -- --run src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/modes/matrix.test.ts src/lib/app-state/history-schema.test.ts src/lib/display/result/display-blocks.test.ts`
- `npx vitest run --config vitest.ui.config.ts src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Pending before commit:

- `git diff --cached --check`

## Coverage Notes

- Parser coverage verifies `\operatorname{basis}(A)` normalization.
- Dispatch coverage verifies inline matrix exact sidecars flow into `basisA`.
- Matrix operation coverage verifies basis, non-basis singular, and rectangular non-basis cases with proof cards.
- UI-runtime coverage verifies inline `basis(bmatrix)` result title/readback cards.
- App-state coverage verifies `basisA` replay seed schema support.
