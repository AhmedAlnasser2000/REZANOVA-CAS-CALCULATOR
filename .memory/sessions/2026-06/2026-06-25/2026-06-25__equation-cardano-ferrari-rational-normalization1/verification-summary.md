# EQUATION-CARDANO-FERRARI-RATIONAL-NORMALIZATION1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/equation/target-shape/route-plan.test.ts src/lib/modes/equation/parameterized-search-trace.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/display/result/display-blocks.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/exp-log.test.ts src/lib/equation/parameterized/trig.test.ts`
  - Passed: 10 files, 147 tests.
- `npm run build`
  - Passed. Vite reported existing dynamic/static import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1024 files, 9 baseline caps.
- `npm run test:ui -- src/AppMain.ui.test.tsx -t "respects the selected angle unit when running Equation numeric interval solve"`
  - Passed: 1 test, 121 skipped.
- `npm run test:ui`
  - Passed after CI follow-up: 38 files, 298 tests.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --check`
  - Passed.

## CI Follow-Up

- GitHub Actions reported a timeout in `src/AppMain.ui.test.tsx` for the Equation numeric interval angle-unit UI flow.
- Stabilized that UI test by lowering the interval grid used only in the UI automation, re-querying interval inputs after settings-panel toggles, and removing the test-local 10s timeout override so the test uses the UI suite timeout.
- No production behavior changed; guarded Equation numeric interval angle-unit math remains covered by unit-level tests.

## Still To Run

- None.
