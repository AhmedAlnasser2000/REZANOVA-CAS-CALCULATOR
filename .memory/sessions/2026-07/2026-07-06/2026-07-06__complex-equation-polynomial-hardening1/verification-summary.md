# COMPLEX-EQUATION-POLYNOMIAL-HARDENING1 Verification Summary

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

- `npx vitest run src/lib/algebra/polynomial-roots.test.ts src/lib/modes/equation/complex-numeric-polynomial-roots.test.ts src/lib/modes/equation/complex-benchmark-region-runner.test.ts`
- `node tools/validate-equation-corpus-ledger.mjs`
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
- `git diff --check`
- `npm run test:memory-protocol`

Blocked by unrelated dirty work:

- `npm run test:file-sizes` failed because `src/lib/display/result/display-blocks.ts` has 917 lines over its 900-line cap. That file is dirty from an unrelated Display/limits lane and is not staged for this Equation gate.

## Playwright Visual Gate

Passed:

- `npx playwright test -c .task_tmp/complex-equation-polynomial-hardening1/playwright.visual.config.ts .task_tmp/complex-equation-polynomial-hardening1/polynomial-hardening-visual.spec.ts`

Visual evidence:

- `.task_tmp/complex-equation-polynomial-hardening1/screenshots/global-polynomial-hardened-evidence.png`
- `.task_tmp/complex-equation-polynomial-hardening1/screenshots/rational-polynomial-pole-evidence.png`

Observed visual result:

- `x^6+x+1=0` with Complex On renders approximate Complex numeric roots with hardened evidence lines for root slots, backward error, and derivative magnitude.
- `(x^6+x+1)/x=0` with Complex On renders the pole-aware rational numeric evidence card and preserves `x != 0` readability.

## Notes

- The first rational visual fixture used `(x^7-x)/x=0`, which correctly routed through an exact special-form path before numeric fallback. The visual fixture was corrected to `(x^6+x+1)/x=0` to exercise the Complex numeric rational evidence card.
- Dev server used `http://127.0.0.1:1421/`.
