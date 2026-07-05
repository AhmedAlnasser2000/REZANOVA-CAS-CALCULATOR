# COMPLEX-EQUATION-LOCAL-BOX-VALIDATION4 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Backend Gates

Passed:

- `npx vitest run src/lib/equation/complex/local-box-validation.test.ts src/lib/equation/complex/contour-moments.test.ts src/lib/equation/complex/seed-grid-newton.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/modes/equation/complex-benchmark-region-runner.test.ts`
- `node tools/validate-equation-corpus-ledger.mjs`
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
- `git diff --check`
- `npm run test:memory-protocol`

Blocked by unrelated dirty work:

- `npm run test:file-sizes`

- `npm run test:file-sizes` failed while unrelated dirty `src/lib/display/result/display-blocks.ts` remains 917 lines over its 900-line cap. That file is not part of this Equation local-box gate and remains unstaged here.

## Playwright Visual Gate

Passed:

- `npx playwright test -c .task_tmp/complex-equation-local-box4/playwright.visual.config.ts .task_tmp/complex-equation-local-box4/local-box-visual.spec.ts`

Visual evidence:

- `.task_tmp/complex-equation-local-box4/screenshots/local-krawczyk-box-validation.png`

Observed visual result:

- `x^2+1+e^x/10=0` with Complex On, Complex Region enabled, `[-2,2] x [-2,2]`, and grid `1` renders two bounded Complex roots with visible `Complex Local Box Validation` evidence.
- The details show two validated local boxes and Krawczyk contraction evidence without `NaN`, `undefined`, or overflow text.
