# EQUATION-ABS-WRAPPER-FORMULA1 Verification Summary

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

- Manual QA follow-up:
  - `|z^3+z+1|=-1` is correct as a Real Exact range-guard/domain-empty stop.
  - `|z^3+z+1|=0` was not correct when it fell through to the old stronger-carrier stop; fixed by adding a Real Exact shared-fallback bridge into the absolute-value formula handoff.
  - Desktop/runtime QA then showed the isolated worker path still failing for `z^3+z+1=0` and `|z^3+z+1|=0`; fixed by preserving the pre-retargeted shared resolved equation across async guarded-solve capture.
- `npm run test:unit -- src/lib/equation/parameterized/composition.test.ts src/lib/display/result/display-blocks.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/equation/target-shape/route-plan.test.ts`
  - Passed: 5 files, 100 tests.
- `npm run test:unit -- src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/shared-symbolic-backend.test.ts src/lib/equation/shared-solve-tests/absolute-value.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/display/result/display-blocks.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/equation/target-shape/route-plan.test.ts`
  - Passed after the zero-case fix: 8 files, 180 tests.
- `npm run test:unit -- src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/ooe-runtime.test.ts src/lib/equation/direct-symbolic-worker/client.test.ts src/lib/modes/equation/shared-symbolic-backend.test.ts src/lib/equation/shared-solve-tests/absolute-value.test.ts src/lib/equation/parameterized/composition.test.ts`
  - Passed after the isolated-worker fix: 6 files, 115 tests.
- `npm run test:unit -- src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/parameterized/generated-formula-validation.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/display/result/display-blocks.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/equation/target-shape/route-plan.test.ts`
  - Passed after the zero-case fix: 9 files, 133 tests.

## Final Gates

- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1028 files checked, 9 baseline caps.
- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed after durable memory edits.

## Notes

- The grouped abs route is Real Exact and one-layer only.
- Complex abs wrappers still stop at the guarded complex preimage boundary.
- Rational abs wrappers require `targetUnderAbs` route evidence so composition remains in the top-level plan alongside rational/Cardano/Ferrari.
