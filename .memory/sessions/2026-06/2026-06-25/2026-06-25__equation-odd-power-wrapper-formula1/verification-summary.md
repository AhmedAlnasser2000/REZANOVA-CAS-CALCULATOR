# EQUATION-ODD-POWER-WRAPPER-FORMULA1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/composition/core.test.ts src/lib/equation/target-shape/profile.test.ts src/lib/equation/target-shape/route-plan.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/parameterized/generated-formula-validation.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/odd-power-wrapper-formula.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/display/result/display-blocks.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts`
  - Passed after the final type-narrowing fix: 12 files, 178 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed after splitting mode regressions into `odd-power-wrapper-formula.test.ts` and tightening the odd-power exponent guard: 1030 files checked, 9 baseline caps.

## Final Gates

- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed after durable memory edits.

## Notes

- An initial `npm run test:file-sizes` failed because `src/lib/equation/composition/core.ts` reached 903 lines and `src/lib/modes/equation/parameterized-families.test.ts` reached 928 lines against the 900-line cap. The fix was to keep `core.ts` at exactly 900 lines and move the new mode regressions to a focused test file instead of raising caps.
- An initial `npm run build` failed because the odd-power carrier exponent field was not narrowed from MathJSON to `number`. The fix was to make `isOddPowerCarrierExponent` a type guard.
