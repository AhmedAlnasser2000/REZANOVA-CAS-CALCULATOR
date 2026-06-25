# EQUATION-HIGHER-EVEN-POWER-WRAPPER-FORMULA1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/composition/core.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/parameterized/generated-formula-validation.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/odd-power-wrapper-formula.test.ts src/lib/modes/equation/higher-even-power-wrapper-formula.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/display/result/display-blocks.test.ts src/lib/equation/target-shape/profile.test.ts src/lib/equation/target-shape/route-plan.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts`
  - Passed: 13 files, 190 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1031 files checked, 9 baseline caps.
- `git diff --check`
  - Passed before durable memory edits.

## Final Gates

- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed after durable memory edits.

## Notes

- Direct composition tests cover exact zero RHS collapse and exact negative RHS domain-empty behavior for high even powers.
- Mode-level exact-zero `^{10}` coverage was intentionally kept out of the app-mode focused set because the broader exact prepass is slow there; the route policy itself is covered at the composition layer.
- Unbraced multi-digit powers are still normalized by the existing input pipeline; direct unit tests use braced exponents such as `^{10}` and `^{14}` where they bypass that UI normalization.
