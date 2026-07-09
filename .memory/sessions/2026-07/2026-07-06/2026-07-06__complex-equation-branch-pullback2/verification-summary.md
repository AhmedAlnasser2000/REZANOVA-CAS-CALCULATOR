# COMPLEX-EQUATION-BRANCH-PULLBACK2 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Backend Gates

Passed:

- `npx vitest run src/lib/equation/complex/branch-cut-policy.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/modes/equation/complex-benchmark-region-runner.test.ts`
- `node tools/validate-equation-corpus-ledger.mjs`
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
- `git diff --check`
- `npm run test:memory-protocol`

Blocked by unrelated dirty work:

- `npm run test:file-sizes`

- `npm run test:file-sizes` failed because unrelated dirty `src/lib/display/result/display-blocks.ts` has 917 lines over its 900-line cap. That file is not part of this Equation branch-pullback gate and remains unstaged here.

## Playwright Visual Gate

Passed:

- `npx playwright test -c .task_tmp/complex-equation-branch-pullback2/playwright.visual.config.ts .task_tmp/complex-equation-branch-pullback2/branch-pullback-visual.spec.ts`

Visual evidence:

- `.task_tmp/complex-equation-branch-pullback2/screenshots/safe-affine-branch-pullback.png`
- `.task_tmp/complex-equation-branch-pullback2/screenshots/broad-pullback-fail-closed.png`

Observed visual result:

- `ln(x-1)+x=2` with Complex On and Complex Region enabled renders a bounded approximate root near `x = 2` plus a `Complex Branch-Cut Policy` card showing real-affine pullback and mapped-region safety evidence.
- `ln(x^2+1)+x=0` with Complex On and Complex Region enabled renders a controlled unsafe error card plus branch-policy details explaining that the composed target-dependent branch pullback is non-affine or unsupported and fails closed.

## Notes

- The first visual fixture tried pure `ln(x-1)=0`, but the UI correctly solved it through the exact Complex preimage route before Complex Region fallback. The visual fixture was changed to `ln(x-1)+x=2` to exercise the bounded region branch-pullback route.
- Dev server used `http://127.0.0.1:1421/`.
