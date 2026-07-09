# COMPLEX-EQUATION-LOCUS-EVIDENCE5 Verification Summary

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

- `npx vitest run src/lib/equation/complex/locus-policy.test.ts src/lib/equation/complex/locus-evidence.test.ts src/lib/modes/equation/complex-abs-wrapper-policy.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts src/lib/modes/equation/complex-benchmark-region-runner.test.ts`
- `node tools/validate-equation-corpus-ledger.mjs`
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
- `git diff --check`
- `npm run test:file-sizes`

## Playwright Visual Gate

Passed:

- `npx playwright test -c .task_tmp/complex-equation-locus-evidence5/playwright.visual.config.ts .task_tmp/complex-equation-locus-evidence5/locus-evidence-visual.spec.ts`

Visual evidence:

- `.task_tmp/complex-equation-locus-evidence5/screenshots/complex-locus-evidence-region.png`

Observed visual result:

- `|z-1|=2` with Complex On and Complex Region enabled renders a controlled error card with `Complex Locus Policy`, `Complex Locus Evidence`, region sampling, residual band, candidate-point evidence, and curve diagnostics.
- The card does not show `Complex Region Roots` or `Complex Contour Verification`, preserving the controlled `locus-deferred` boundary.

## Memory Gate

- Shared current-state, decisions, and journal files were not edited for this commit because unrelated staged Limits memory changes were already present. The completion report records this conflict to keep the Equation commit narrow.
