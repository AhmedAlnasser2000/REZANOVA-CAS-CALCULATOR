# MATRIX-DIAGONALIZATION-SPECTRAL-MILESTONE1 Gate B Verification Summary

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

- `npm test -- --run src/lib/algebra/variable-hints.test.ts src/lib/navigation/menu.test.ts src/lib/linear-algebra/editor-parser.test.ts src/lib/linear-algebra/editor-dispatch.test.ts src/lib/linear-algebra/matrix.test.ts src/lib/modes/matrix.test.ts src/lib/app-state/history-schema.test.ts src/lib/display/result/display-blocks.test.ts`
- `npx vitest run --config vitest.ui.config.ts src/app/runtime/useLinearAlgebraTableShellRuntime.ui.test.tsx`
- `npx tsc --pretty false --noEmit --target ES2022 --lib ES2022,DOM,DOM.Iterable --module ESNext --moduleResolution bundler --jsx react-jsx --types vite/client --skipLibCheck --strict --noUnusedLocals --noUnusedParameters --erasableSyntaxOnly --noFallthroughCasesInSwitch --noUncheckedSideEffectImports src/lib/linear-algebra/matrix-diagonalization.ts src/lib/linear-algebra/matrix-eigen.ts src/lib/linear-algebra/matrix.ts src/lib/linear-algebra/editor-parser.ts src/lib/linear-algebra/editor-dispatch.ts src/lib/modes/matrix.ts src/lib/navigation/menu.ts src/lib/algebra/variable-hints.ts src/lib/app-state/schemas.ts src/lib/display/result/display-blocks.ts src/types/calculator/runtime-types.ts`
- `npm run test:file-sizes`
- `npx tsc -b --pretty false`

## Coverage Notes

- Matrix runtime coverage verifies `mpow([[2,1],[1,2]],3)` gives `[[14,13],[13,14]]`.
- Result-card coverage verifies `D^3`, `PD^3P^{-1}`, and diagonalization proof readback.
- Defective-case coverage verifies power requests stop through the same not-diagonalizable explanation.
- Dispatch and replay coverage verify `spectralPowerA/B` request shape, exponent metadata, and history schema compatibility.
- UI-runtime coverage verifies the typed inline `mpow(...)` title and visible power cards.
- Keypad coverage verifies the Matrix inverse key exposes shifted `mpow(...)` insertion.
- Variable-hint coverage verifies `mpow(...)` does not produce fake ambiguous variables.
