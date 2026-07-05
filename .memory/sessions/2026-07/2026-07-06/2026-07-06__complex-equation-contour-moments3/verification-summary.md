# COMPLEX-EQUATION-CONTOUR-MOMENTS3 Verification Summary

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

- `npx vitest run src/lib/equation/complex/contour-moments.test.ts src/lib/equation/complex/seed-grid-newton.test.ts src/lib/equation/complex/contour-winding.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/modes/equation/complex-benchmark-region-runner.test.ts`
- `node tools/validate-equation-corpus-ledger.mjs`
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
- `git diff --check`
- `npm run test:memory-protocol`

Blocked by unrelated dirty work:

- `npm run test:file-sizes`

- `npm run test:file-sizes` failed while unrelated dirty `src/lib/display/result/display-blocks.ts` remains 917 lines over its 900-line cap. That file is not part of this Equation contour-moment gate and remains unstaged here.

## Playwright Visual Gate

Passed:

- `npx playwright test -c .task_tmp/complex-equation-contour-moments3/playwright.visual.config.ts .task_tmp/complex-equation-contour-moments3/contour-moments-visual.spec.ts`

Visual evidence:

- `.task_tmp/complex-equation-contour-moments3/screenshots/coarse-grid-contour-moment-seeds.png`

Observed visual result:

- `x^2+1+e^x/10=0` with Complex On, Complex Region enabled, `[-2,2] x [-2,2]`, and grid `1` renders two bounded Complex roots plus visible `Complex Contour Moments` evidence.
- The detail cards show contour-moment fallback attempted, two contour-moment seeds, two accepted moment seeds, and contour-count verification for two roots.

## Notes

- The prior subdivision fixture now resolves before splitting because moment seeds close the initial safe two-root cell. The test expectation was updated to reflect this intended precedence.
- Dev server used `http://127.0.0.1:1421/`.
