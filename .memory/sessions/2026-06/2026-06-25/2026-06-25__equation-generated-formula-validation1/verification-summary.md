# EQUATION-GENERATED-FORMULA-VALIDATION1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/parameterized/generated-formula-validation.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts`
  - Passed: 2 files, 10 tests.
- `npm run test:unit -- src/lib/equation/parameterized/generated-formula-validation.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/target-shape/route-plan.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/exp-log.test.ts src/lib/equation/parameterized/trig.test.ts src/lib/equation/parameterized/carrier.test.ts src/lib/equation/parameterized/carrier-elimination.test.ts src/lib/equation/parameterized/mixed-algebraic.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/display/result/display-blocks.test.ts`
  - Passed: 12 files, 142 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1027 files checked, 9 baseline caps.
- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed after durable memory edits.

## Notes

- This is an internal policy/substrate gate only.
- Production generated/wrapper Cardano and Ferrari remain non-live.
