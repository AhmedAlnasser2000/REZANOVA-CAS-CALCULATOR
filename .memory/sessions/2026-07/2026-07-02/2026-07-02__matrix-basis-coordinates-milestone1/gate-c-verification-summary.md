# MATRIX-BASIS-COORDINATES-MILESTONE1 Gate C Verification Summary

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

- Parser coverage verifies `\operatorname{change}(A,B)` and `\operatorname{changebasis}(A,B)`.
- Dispatch coverage verifies named and inline source/target basis matrices produce `changeBasis` requests with exact sidecars.
- Matrix operation coverage verifies the direction convention `P_{B<-A}=B^{-1}A`, facts cards, proof cards, and non-basis stops.
- Mode coverage verifies direct change-of-basis titles and proof lines.
- App-state coverage verifies `changeBasis` replay seed schema support.
- Variable-hint coverage verifies `change(...)` does not produce fake Matrix parameter pills.
- UI-runtime coverage remains green for the shared Linear Algebra shell after operation-shape changes.
