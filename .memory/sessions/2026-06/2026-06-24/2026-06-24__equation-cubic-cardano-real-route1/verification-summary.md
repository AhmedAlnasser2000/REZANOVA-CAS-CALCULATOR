# EQUATION-CUBIC-CARDANO-REAL-ROUTE1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/roots/cubic-cardano-roots.test.ts src/lib/equation/target-shape/route-plan.test.ts src/lib/equation/target-shape/search-trace.test.ts src/lib/equation/presentation/finite-roots.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/equation/equation-algebraic-isolation.test.ts src/lib/equation/parameterized/higher-degree-polynomial-policy.test.ts src/lib/display/result/display-blocks.test.ts`
  - Passed after CI follow-up: 9 files, 73 tests.
- `npm run test:unit -- src/lib/equation/readback/finite-branches.test.ts src/lib/equation/parameterized/trig.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/factorable-polynomial.test.ts src/lib/equation/parameterized/special-form-roots.test.ts src/lib/modes/equation/frontier-special-form-roots.test.ts src/lib/modes/equation/complex-domain.test.ts`
  - Passed: 7 files, 92 tests.
- `npm run test:unit -- src/lib/equation/readback/normalization.test.ts src/lib/equation/readback/mathjson-branches.test.ts src/lib/modes/equation/answer-modes.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/equation/target-shape/route-plan.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts`
  - Passed: 7 files, 78 tests.
- `npm run test:unit`
  - Passed: 253 files, 1908 tests.
- `npm run build`
  - First rerun exposed a type-only helper annotation issue; after fixing it, passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed.
- `npm run test:memory-protocol`
  - Passed after final memory update.
- `git diff --check`
  - Passed after final memory update.

## CI Issues Repaired

- Real Exact non-factorable numeric cubics now reach Real Cardano after the shared exact solver stops: `x^3+x+1=0` specializes to `\Delta>0`, and `x^3-3*x+1=0` specializes to the `\Delta<0` trig/arccos case.
- Direct cube-power and generated cube-root isolation cases stay on the older radical/algebraic-isolation path before Cardano.
- The affine special-form root set no longer drops the `x=1` branch from `(2x-1)^{12}-5(2x-1)^6+4=0`.
- Readback normalization preserves valid command-variable spacing for `\pi n` and user-variable `i\cdot i` while still simplifying confirmed imaginary-unit products.

## Still To Run

- None.
