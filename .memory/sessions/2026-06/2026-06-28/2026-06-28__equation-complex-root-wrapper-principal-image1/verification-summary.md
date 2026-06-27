# EQUATION-COMPLEX-ROOT-WRAPPER-PRINCIPAL-IMAGE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Status

Verified as a backend Equation wrapper milestone.

## Evidence

- `npm run test:unit -- src/lib/modes/equation/complex-root-wrapper-principal-image.test.ts src/lib/modes/equation/complex-power-wrapper-catchup.test.ts src/lib/modes/equation/complex-wrapper-baseline-lock.test.ts src/lib/equation/roots/complex-principal-image.test.ts`
  - Passed: 4 files, 20 tests.
- `npm run test:unit -- src/lib/modes/equation/complex-preimage-wrapper-catchup.test.ts src/lib/modes/equation/complex-wrapper-role-power-policy-lock.test.ts src/lib/equation/complex/special-form-roots.test.ts`
  - Passed: 3 files, 11 tests.
- `npm run test:unit -- src/lib/modes/equation/nth-root-wrapper-formula.test.ts src/lib/modes/equation/real-wrapper-coverage-bundle.test.ts src/lib/modes/equation/mixed-radical-wrapper-bundle.test.ts`
  - Passed: 3 files, 10 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic/static import chunk warnings only.
- `npm run lint`
  - Passed.
- `npm run test:file-sizes`
  - Passed. File sizes are within caps.
- `git diff --check`
  - Passed.

## Notes

- Memory protocol will be rerun immediately before commit after staging only this milestone.
- An unrelated staged Risch-Norman dispatch-probe lane was present and must stay out of this commit.
