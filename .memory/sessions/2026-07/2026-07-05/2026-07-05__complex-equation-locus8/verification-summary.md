## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification Summary

- Gate: ui.
- Focused Vitest passed:
  - `npx vitest run src/lib/equation/complex/locus-policy.test.ts src/lib/modes/equation/complex-abs-wrapper-policy.test.ts src/lib/modes/equation/complex-benchmark-region-runner.test.ts src/lib/modes/equation/complex-region-nonlinear-solve.test.ts`
- Equation corpus ledger passed:
  - `node tools/validate-equation-corpus-ledger.mjs`
  - `node --test tools/validate-equation-corpus-ledger.test.mjs`
- Whitespace and file-size gates passed:
  - `git diff --check`
  - `npm run test:file-sizes`
- TypeScript gate attempted:
  - `npx tsc -b --pretty false`
  - Blocked by unrelated dirty Guide lane: `src/lib/guide/content.contract.test.ts(71,31): error TS18048: 'article.relatedArticleIds' is possibly 'undefined'.`
- Playwright visual verification passed after sandbox escalation:
  - `npx playwright test .task_tmp/complex-equation-locus8/locus-visual.spec.ts --config .task_tmp/complex-equation-locus8/playwright.visual.config.ts`
- Visual evidence:
  - `.task_tmp/complex-equation-locus8/screenshots/complex-locus-deferred.png`
  - `.task_tmp/complex-equation-locus8/screenshots/complex-abs-boundary-empty.png`
- Screenshot inspection: locus stop and abs boundary cards were readable, showed the expected policy/evidence, and had no obvious text overlap or overflow.

## Evidence Notes

- `\left|z-1\right|=2` with Complex Region enabled visually verifies that non-holomorphic locus cases stop before bounded analytic contour solving.
- `\left|2x+1\right|=x-5` visually verifies the controlled Complex abs boundary empty-set card and candidate evidence.
- The file-size gate initially flagged `symbolic.ts` after inline locus wiring; the final implementation extracts that wiring to `complex-symbolic-boundary.ts`, and `npm run test:file-sizes` now passes.
