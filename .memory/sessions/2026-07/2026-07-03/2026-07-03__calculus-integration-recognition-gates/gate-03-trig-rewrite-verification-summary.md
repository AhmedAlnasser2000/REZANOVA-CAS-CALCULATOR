# CALCULUS-INTEGRATION-BOUNDED-TRIG-REWRITE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Backend Gate

Passed:

- `npx vitest run src/lib/symbolic-engine/integration-recognition-gates.test.ts src/lib/symbolic-engine/integration.test.ts`
- `npx vitest run src/lib/calculus/workspace/integrals.test.ts`
- `node tools/validate-calculus-integration-corpus-ledger.mjs`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
- `git diff --check -- src/lib/symbolic-engine/integration/trig-rewrite.ts src/lib/symbolic-engine/integration/dispatch.ts src/lib/symbolic-engine/integration/trig-derivative-products.ts src/lib/symbolic-engine/integration-recognition-gates.test.ts src/lib/calculus/engine/integration.ts src/lib/calculus/workspace/integrals.test.ts`

Blocked outside this gate:

- `npx tsc -b --pretty false` still stops in `src/app/runtime/historyDisplayEntry.test.ts` because a readonly tuple `lineKinds` fixture is not assignable to mutable `DisplayDetailSection.lineKinds`.
- After the integration narrowing fix, `tsc` reports no Calculus integration errors before that unrelated app-runtime test error.

## Playwright Visual Gate

Passed:

- `npx playwright test trig-rewrite-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`
- `npx playwright test normal-form-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`
- `npx playwright test first200-current-tail-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`

Partial survey command:

- `npx playwright test first200-current-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts` rendered and recorded the first 50 current first-200 cases, then the page target crashed while trying to screenshot a no-output state. The robust tail command above reran cases 51-200 in isolated pages.

Visual evidence inspected:

- `.task_tmp/calculus-integration-recognition-gates/trig-rewrite-visual/sin-minus-cos-square.png`
- `.task_tmp/calculus-integration-recognition-gates/trig-rewrite-visual/one-plus-two-cos-square.png`
- `.task_tmp/calculus-integration-recognition-gates/trig-rewrite-visual/cos-times-tan-sec-sum.png`
- `.task_tmp/calculus-integration-recognition-gates/trig-rewrite-visual/mixed-recognition-gates.png`
- `.task_tmp/calculus-integration-recognition-gates/trig-rewrite-visual/definite-boundary-numeric.png`
- `.task_tmp/calculus-integration-recognition-gates/first200-current-visual/calc.int.indef.thomas.first200.0048.png`
- `.task_tmp/calculus-integration-recognition-gates/first200-current-visual/calc.int.indef.thomas.first200.0049.png`
- `.task_tmp/calculus-integration-recognition-gates/first200-current-visual/calc.int.indef.thomas.first200.0050.png`
- `.task_tmp/calculus-integration-recognition-gates/normal-form-visual/sum-root-powers.png`

First-200 current visual survey:

- First 50 rows rendered in the single-page survey.
- Rows 51-200 rendered in the isolated tail survey.
- Combined rows: 200.
- Current visible successes: 199.
- Current no-output survey row: 1, `calc.int.indef.thomas.first200.0061`.
- The no-output screenshot shows the survey remained on the Calculate workspace rather than the Calculus indefinite-integral screen. Backend evaluation and the focused `normal-form-visual` rerun both show the same `sqrt(x)+x^(1/3)` family succeeds with an answer card plus `Integration Normal Form` detail card, so this was recorded as a survey-navigation miss, not an integration capability failure.

Notes:

- The focused rewrite cases render answer cards and `Integration Trig Rewrite` cards without obvious overflow.
- The mixed recognition case renders normal-form, affine trig, and trig-rewrite evidence together.
- The definite-integral boundary case remains `Numeric fallback` and does not render an `Integration Trig Rewrite` card.
