# CALCULUS-INTEGRATION-READBACK-CLARITY1 Verification Summary

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

- `npx vitest run src/lib/symbolic-engine/integration-recognition-gates.test.ts`
- `node tools/validate-calculus-integration-corpus-ledger.mjs`
- `npm run test:memory-protocol`
- `git diff --check`

Readback scan:

- Scanned 200 Thomas first-200 integration ledger rows through `resolveSymbolicIntegralFromLatex`.
- Current supported rows: 197.
- Current unsupported boundary rows: 3.
- Ambiguous coefficient-factor pattern count: 0.
- Double-negative fraction group count: 0.

Blocked outside this gate:

- `npx tsc -b --pretty false` still stops in unrelated files:
  - `src/app/runtime/historyDisplayEntry.test.ts` readonly `lineKinds` fixture assignment.
  - `src/lib/equation/parameterized/trig-direct.ts` nullable/MathJson indexing errors.
- `npm run test:file-sizes` still stops on unrelated `src/lib/equation/parameterized/exp-log-core.ts` at 981 lines over its 900-line cap. This calculus pass moved the new generated-LaTeX helper out of `integration/rational.ts`, leaving that file at 898 lines.
- `npx vitest run src/lib/symbolic-engine/integration-recognition-gates.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/integration-rational-partial-fractions.test.ts` has an unrelated route-precedence expectation in `integration-rational-partial-fractions.test.ts`: a repeated quadratic overlap now reports `partial-fractions` where the test expects `u-substitution`.

## Playwright Visual Gate

Passed:

- `npx playwright test readback-clarity-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`
- `npx playwright test normal-form-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`
- `npx playwright test case199-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts`

First-200 visual survey:

- `npx playwright test first200-current-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts` rendered rows 1-50, then the browser target crashed while trying to screenshot a no-output state after row 50.
- `npx playwright test first200-current-tail-visual.spec.ts --config .task_tmp/calculus-integration-recognition-gates/playwright.visual.config.ts` rendered rows 51-198 and row 200 successfully; row 199 hit the aggregate 90-second Playwright timeout while the error context still showed the Calculate launcher.
- The isolated row-199 command passed in 5.9 seconds and rendered `ln|3x^2+4x+1|`, confirming the aggregate timeout was a survey stability/setup issue rather than a row-199 math output failure.

Visual evidence inspected:

- `.task_tmp/calculus-integration-recognition-gates/readback-clarity-visual/sum-root-powers.png`
- `.task_tmp/calculus-integration-recognition-gates/readback-clarity-visual/mixed-root-quotients.png`
- `.task_tmp/calculus-integration-recognition-gates/readback-clarity-visual/negative-affine-sine.png`
- `.task_tmp/calculus-integration-recognition-gates/case199-visual/calc.int.indef.thomas.first200.0199.png`

Observed visual result:

- `sqrt(x)+x^(1/3)` now renders as explicit `2/3` and `3/4` coefficient fractions beside powered terms, not as a mixed-number-looking sequence.
- `sin(7-3x)` now renders as `cos(7-3x)/3`, not as `-(-cos(7-3x)/3)`.
