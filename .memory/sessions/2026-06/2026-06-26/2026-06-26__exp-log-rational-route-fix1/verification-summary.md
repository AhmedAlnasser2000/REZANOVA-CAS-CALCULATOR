# EXP-LOG-RATIONAL-ROUTE-FIX1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/target-shape/route-plan.test.ts src/lib/equation/parameterized/exp-log.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/parameterized-search-trace.test.ts`
  - Passed: 4 unit files, 93 tests.
- `npm run test:ui -- src/AppMain.ui.test.tsx -t "stores explicit named variables"`
  - Passed: 1 targeted UI test.
- `npm run test:ui -- src/AppMain.ui.test.tsx`
  - Passed: 1 UI file, 122 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1037 files, 9 baseline caps.
- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed.

## Focused Evidence

- Route-plan tests prove denominator-shaped exp/log wrappers retain `rational`, `cubic-cardano`, `quartic-ferrari`, `exp-log`, `composition`, and isolation families.
- Mode tests prove Real Exact `\ln((z^3+z+1)/(z-m))=b` and `\ln((z^4+z+1)/(z-m))=b` return successful real formula outcomes with `z-m\ne0` and Real Cardano/Ferrari detail evidence.
- Search-trace tests prove top-level `exp-log` and generated `cubic-cardano` both record attempted/success evidence for the rational log carrier.
- UI tests prove the variable-hint strip waits for the fresh adjacent-letter hint after a stored-variable scenario.

## Remaining Gates

- None.
