# Calculus Limits Frontier Verification Summary

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## 2026-07-05 - CALCULUS-LIMITS-ASYMPTOTIC-SCALE-ENGINE2

- Gate type: backend plus app-visible output.
- Scope: widened Limits infinity-scale terms for scaled logarithms, logarithms of power/root/exponential scales, and real-valid square-root ratios at negative infinity.
- Focused tests:
  - `npm run test:unit -- src/lib/symbolic-engine/limits/infinity-scale-terms.test.ts`
  - `npm run test:unit -- src/lib/symbolic-engine/limits/infinity-scale-terms.test.ts src/lib/calculus/workspace/limits.test.ts`
- Visual verification:
  - `node .task_tmp/limits-asymptotic-scale-engine2/visual-check.mjs`
  - Screenshot: `.task_tmp/limits-asymptotic-scale-engine2/log-root-visual.png`
  - Evidence: rendered Answer `\frac{1}{2}` for `lim x -> infinity log(sqrt(x))/log(x)` and expanded Limit Method text containing infinity-scale evidence.
- Broad gates:
  - `npx tsc -b --pretty false`
  - `npm run test:file-sizes`
  - `git diff --check`

## 2026-07-05 - CALCULUS-LIMITS-MRV-PREGRUNTZ3

- Gate type: backend plus app-visible output.
- Scope: extended MRV-lite residual quotient cleanup for exact-cancelled logarithmic exponent differences, including nested log residuals in exponential products and quotients.
- Focused tests:
  - `npm run test:unit -- src/lib/symbolic-engine/limits/mrv-lite.test.ts src/lib/calculus/workspace/limits.test.ts`
- Visual verification:
  - `node .task_tmp/limits-mrv-pregruntz3/visual-check.mjs`
  - Screenshot: `.task_tmp/limits-mrv-pregruntz3/nested-log-residual-visual.png`
  - Evidence: rendered Answer `1` for `lim x -> infinity e^{log(log(x))}/log(x)` and expanded Limit Method text containing MRV-lite residual-scale evidence.
- Broad gates:
  - `npx tsc -b --pretty false`
  - `npm run test:file-sizes`
  - `npm run test:memory-protocol`
  - `git diff --check`

## 2026-07-05 - CALCULUS-LIMITS-BRANCH-DOMAIN-PROOFS2

- Gate type: backend plus app-visible output.
- Scope: standardized compact branch/domain proof evidence for absolute-value side behavior, Piecewise branch disagreement, complex proof-first stops, and Real-mode domain stops. Also guarded finite log local-series expansion so `log(x)` at a boundary does not get treated as a Taylor series around `1`.
- Focused tests:
  - `npm run test:unit -- src/lib/symbolic-engine/limits/abs-side-behavior.test.ts src/lib/symbolic-engine/limits/piecewise-limits.test.ts src/lib/symbolic-engine/limits/complex-domain.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/engine/core.test.ts`
  - `npm run test:ui -- src/app/workspaces/CalculusLimitEditorSource.ui.test.tsx`
- Visual verification:
  - `node .task_tmp/limits-branch-domain-proofs2/visual-check.mjs`
  - Screenshots: `.task_tmp/limits-branch-domain-proofs2/domain-gap-sqrt.png`, `.task_tmp/limits-branch-domain-proofs2/abs-two-sided-failure.png`
  - Evidence: `lim x -> 0 sqrt(x)` shows a Real-mode domain error with visible `Domain Proof`; `lim x -> 0 |x|/x` shows the left/right no-limit proof card.
- Broad gates:
  - `npx tsc -b --pretty false`
  - `npm run test:file-sizes`
  - `npm run test:memory-protocol`
  - `git diff --check`
