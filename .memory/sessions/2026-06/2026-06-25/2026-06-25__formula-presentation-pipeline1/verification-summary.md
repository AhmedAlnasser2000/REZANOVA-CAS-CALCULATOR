# FORMULA-PRESENTATION-PIPELINE1 Verification Summary

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

- `npm run test:unit -- src/lib/display/result/display-blocks.test.ts src/app/shell/DisplayPanel.ui.test.tsx src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/modes/equation/parameterized-families.test.ts`
  - Passed: 5 executed unit files, 128 tests. The unit runner does not execute `.ui.test.tsx` files under this config.
- `npm run test:ui -- src/app/shell/DisplayPanel.ui.test.tsx`
  - Passed: 1 UI file, 7 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1037 files, 9 baseline caps.
- `git diff --check`
  - Passed.

## Focused Evidence

- Direct Real Cardano case rows now expose `conditionLatex` for `\Delta>0` and repeated-root guards.
- Direct Real Ferrari case rows now expose `conditionLatex` for radicand guards such as `s_{+}\ge0`.
- Grouped wrapper formula rows preserve generated-branch labels while rendering row guards as `when` conditions.
- UI coverage verifies `caseMath` answers show the `when` treatment while Copy Result still uses the original exact LaTeX payload.
