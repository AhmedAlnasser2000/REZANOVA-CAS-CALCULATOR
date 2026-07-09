# Calculus Limits Frontier Verification Summary

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
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

## 2026-07-05 - CALCULUS-LIMITS-CORPUS-HARNESS1

- Gate type: backend/tooling plus app-visible output sample.
- Scope: added the source-controlled Limits seed corpus under `benchmarks/calculus-corpus/limits/`, including source registry, schema notes, unique/duplicate/run/finding ledgers, 27 canonical seed cases, a validator, `test:calculus-limits-corpus`, and a focused execution test that checks route expectations, answers, controlled errors, and proof-card text.
- Focused tests:
  - `npm run test:calculus-limits-corpus`
  - `npm run test:unit -- src/lib/calculus/limit-route-corpus.test.ts src/lib/calculus/workspace/limits.test.ts`
- Visual verification:
  - `node .task_tmp/limits-corpus-harness1/visual-check.mjs`
  - Screenshots: `.task_tmp/limits-corpus-harness1/infinity-log-over-x.png`, `.task_tmp/limits-corpus-harness1/oscillation-proof.png`, `.task_tmp/limits-corpus-harness1/symbolic-parameter-cases.png`
  - Evidence: the app rendered the seed-harness sample answer for `lim x -> infinity log(x)/x`, the no-limit oscillation proof for `lim x -> 0 sin(1/x)`, and guarded parameter cases for `lim x -> infinity a*x`.
- Broad gates:
  - `npx tsc -b --pretty false`
  - `npm run test:file-sizes`
  - `npm run test:memory-protocol`
  - `git diff --check`

## 2026-07-05 - CALCULUS-LIMITS-GRUNTZ-FOUNDATION1

- Gate type: backend foundation.
- Scope: added Limits-owned Gruntz foundation contracts for MRV-set extraction, comparability classes, rewrite-to-`w`, and quotient sign/limit extraction fixtures. No app-visible Limit route or public solver behavior changed in this gate.
- Focused tests:
  - `npm run test:unit -- src/lib/symbolic-engine/limits/gruntz-foundation.test.ts src/lib/symbolic-engine/limits/mrv-lite.test.ts`
- Visual verification:
  - Not run for this gate because no app-visible output route, screen, or Display behavior changed. The contract is dormant foundation code covered by unit fixtures.
- Broad gates:
  - `npx tsc -b --pretty false`
  - `npm run test:file-sizes`
  - `npm run test:memory-protocol`
  - `git diff --check`
