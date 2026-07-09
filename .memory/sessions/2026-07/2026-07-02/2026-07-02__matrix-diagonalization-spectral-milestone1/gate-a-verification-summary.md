# MATRIX-DIAGONALIZATION-SPECTRAL-MILESTONE1 Gate A Verification Summary

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

- `npm test -- --run src/lib/algebra/variable-hints.test.ts src/lib/navigation/menu.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/modes/matrix.test.ts src/lib/app-state/history-schema.test.ts src/lib/display/result/display-blocks.test.ts`
- `npx vitest run --config vitest.ui.config.ts src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npx tsc --pretty false --noEmit --target ES2022 --lib ES2022,DOM,DOM.Iterable --module ESNext --moduleResolution bundler --jsx react-jsx --types vite/client --skipLibCheck --strict --noUnusedLocals --noUnusedParameters --erasableSyntaxOnly --noFallthroughCasesInSwitch --noUncheckedSideEffectImports src/lib/linear-algebra/matrix-diagonalization.ts src/lib/linear-algebra/matrix-eigen.ts src/lib/linear-algebra/matrix.ts src/lib/linear-algebra/editor-parser.ts src/lib/linear-algebra/editor-dispatch.ts src/lib/modes/matrix.ts src/lib/navigation/menu.ts src/lib/algebra/variable-hints.ts src/lib/app-state/schemas.ts src/lib/display/result/display-blocks.ts src/types/calculator/runtime-types.ts`
- `npm run test:file-sizes`
- `git diff --check`

## Blocked Global Gate

- `npx tsc -b --pretty false` is blocked by current committed Calculus errors in `src/lib/calculus/engine/limits.ts` where `FiniteLimitRuleValue | undefined` is passed to `LimitValue` positions. This gate did not modify that file.

## Coverage Notes

- Matrix runtime coverage verifies `diag([[2,1],[1,2]])` gives `A=PDP^{-1}` with exact `P`, `D`, and `P^{-1}` cards.
- Defective-case coverage verifies `[[2,1],[0,2]]` explains the repeated eigenvalue has only one independent eigenvector.
- Dispatch and replay coverage verify `diagonalizeA/B` request shape and history schema compatibility.
- UI-runtime coverage verifies the typed inline `diag(...)` title and visible diagonalization cards.
- Keypad coverage verifies the Matrix `eigen` key exposes shifted `diag(...)` insertion.
- Variable-hint coverage verifies `diag(...)` does not produce fake ambiguous variables.
