# EXP-LOG-WRAPPER-FORMULA1 Verification Summary

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

- `npm run test:unit -- src/lib/equation/parameterized/exp-log.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/modes/equation/parameterized-search-trace.test.ts`
  - Passed: 4 files, 110 tests.
- `npm run test:unit -- src/lib/equation/parameterized/exp-log.test.ts src/lib/equation/parameterized/generated-branch-handoff.test.ts src/lib/equation/parameterized/generated-formula-validation.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/modes/equation/parameterized-families.test.ts src/lib/modes/equation/complex-domain.test.ts src/lib/modes/equation/parameterized-search-trace.test.ts src/lib/display/result/display-blocks.test.ts src/app/shell/DisplayPanel.ui.test.tsx`
  - Passed: 8 executed unit files, 194 tests. The unit runner does not execute `.ui.test.tsx` under this config.
- `npm run test:ui -- src/app/shell/DisplayPanel.ui.test.tsx`
  - Passed: 1 UI file, 7 tests.
- `npm run build`
  - Passed. Vite reported the existing dynamic-import chunking warnings.
- `npm run test:file-sizes`
  - Passed: 1037 files, 9 baseline caps.
- `npm run test:memory-protocol`
  - Passed after durable memory edits.
- `git diff --check`
  - Passed.

## Focused Evidence

- Direct exp/log unit tests prove Real formula handoff solves generated cubics and quartics for log, exponential, symbolic-base log/exponential, and rational-cleared generated equations.
- Mode tests prove Real Exact `\ln(z^3+z+1)=b` and `a^{z^4+z+1}=d` return Real `caseMath` formula answers with expected domain facts.
- Complex mode tests prove the same generated exp/log formula path remains unsupported in Complex Exact and does not surface Real Cardano/Ferrari detail cards.
- Search-trace tests prove Real exp/log formula handoff records generated `cubic-cardano` route attempts and success.
