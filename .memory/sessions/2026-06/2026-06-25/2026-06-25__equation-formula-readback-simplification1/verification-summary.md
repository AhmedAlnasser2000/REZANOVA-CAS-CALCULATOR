# EQUATION-FORMULA-READBACK-SIMPLIFICATION1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/modes/equation/higher-even-power-wrapper-formula.test.ts src/lib/modes/equation/nth-root-wrapper-formula.test.ts src/lib/modes/equation/odd-power-wrapper-formula.test.ts src/lib/display/result/display-blocks.test.ts`
  - Passed: 7 files, 103 tests.
- `npm run test:unit -- src/lib/equation/composition/core.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/parameterized/generated-formula-validation.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/odd-power-wrapper-formula.test.ts src/lib/modes/equation/higher-even-power-wrapper-formula.test.ts src/lib/modes/equation/nth-root-wrapper-formula.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/display/result/display-blocks.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/equation/target-shape/route-plan.test.ts`
  - Passed: 13 files, 197 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1037 files, 9 baseline caps.
- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed.

## Focused Output Evidence

- `x^3+p*x+2=0` now renders substituted Cardano rows without `\frac{2}{2}` fragments and uses simplified detail `\Delta=1+\left(\frac{p}{3}\right)^3`.
- `(z^3+z+1)^{10}=0` now renders `\frac{1}{4}+\frac{1}{27}` instead of nested `\left(\frac{1}{2}\right)^2+\left(\frac{1}{3}\right)^3`.
- `(z^4+z+1)^6=b` Ferrari wrapper output no longer starts primary rows with `0+`.
- `x^4+p*x^2+r=0` keeps the biquadratic shape readable and avoids `x=0\pm...` detail noise.

## Notes

- A first build attempt caught unused imports left after helper consolidation. The cleanup removed those imports and retained the same behavior.
- This gate intentionally does not attempt deeper algebraic simplification, radical denesting, or condition proving.
