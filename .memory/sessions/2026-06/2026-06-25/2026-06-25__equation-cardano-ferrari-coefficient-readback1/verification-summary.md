# EQUATION-CARDANO-FERRARI-COEFFICIENT-READBACK1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/display/result/display-blocks.test.ts`
  - Passed: 4 files, 67 tests.
- `npm run test:unit -- src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/parameterized/generated-formula-validation.test.ts`
  - Passed: 3 files, 59 tests.
- `npm run test:unit -- src/lib/equation/target-shape/route-plan.test.ts src/lib/equation/target-shape/search-trace.test.ts src/lib/equation/presentation/finite-roots.test.ts src/lib/equation/roots/cubic-cardano-roots.test.ts src/lib/equation/roots/quartic-ferrari-roots.test.ts`
  - Passed: 5 files, 29 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1033 files checked, 9 baseline caps.
- `git diff --check`
  - Passed before durable memory edits.

## Final Gates

- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed after durable memory edits.

## Notes

- The new readback classifier is intentionally presentation-facing; it does not change route order or formula correctness.
- Exact-rational factorable/special-form routes still get the first chance before Cardano/Ferrari.
- Fully concrete non-factorable coefficient cases now avoid generic helper-symbol primary answers when Cardano/Ferrari is the selected route.
