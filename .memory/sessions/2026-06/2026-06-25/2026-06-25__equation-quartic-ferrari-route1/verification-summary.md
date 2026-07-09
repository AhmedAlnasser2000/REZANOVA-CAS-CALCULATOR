# EQUATION-QUARTIC-FERRARI-ROUTE1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/parameterized/quartic-ferrari.test.ts src/lib/equation/roots/quartic-ferrari-roots.test.ts src/lib/equation/target-shape/route-plan.test.ts src/lib/equation/target-shape/search-trace.test.ts src/lib/modes/equation/parameterized-search-trace.test.ts src/lib/equation/presentation/finite-roots.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/equation/parameterized/higher-degree-polynomial-policy.test.ts src/lib/display/result/display-blocks.test.ts src/lib/equation/parameterized/cubic-cardano.test.ts src/lib/equation/parameterized/readback.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/exp-log.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/parameterized/trig.test.ts`
  - Passed: 15 files, 169 tests.
- `npm run build`
  - Passed after a helper type annotation fix. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - First run failed because `src/lib/modes/equation/parameterized.ts` exceeded its 900-line cap.
  - Passed after extracting the formula-route helper; `parameterized.ts` is now 862 lines.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --check`
  - Passed.

## CI Issues Repaired During Gate

- Reworded Ferrari-deferred readback so rational-cleared quartic stops name the deferred Ferrari path instead of showing a generic quartic formula stop.
- Extracted Cardano/Ferrari formula-route orchestration into `src/lib/modes/equation/parameterized-formula-routes.ts` to satisfy the file-size ratchet without raising caps.
- Added generated-handoff regressions for composition, exp/log, direct generated branch handoff, and nonlinear trig arguments so Ferrari cannot accidentally become live under wrappers.

## Still To Run

- None.
