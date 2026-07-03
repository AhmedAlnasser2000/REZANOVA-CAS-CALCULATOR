# EQUATION-CORPUS-ALGTRIG-SCAN2 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Commands

- `npx vite-node .task_tmp/equation-corpus-scan2/run-openstax-batch.ts --write-ledger`
  - Passed; wrote 150 scan2 run rows, 150 unique rows, 40 duplicate rows, and 18 scan2 findings.
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
  - Passed; 5 tests.
- `node tools/validate-equation-corpus-ledger.mjs`
  - Passed; ledger has 10 sources, 200 unique cases, 40 duplicate records, 206 run results, and 24 scan findings.
- `npx playwright test --config .task_tmp/equation-corpus-scan2/playwright.visual.config.ts`
  - Passed; 4 browser tests using the real Equation UI.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --check -- benchmarks/equation-corpus/ledger tools/validate-equation-corpus-ledger.test.mjs .memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan2`
  - Passed.
- `npx eslint tools/validate-equation-corpus-ledger.test.mjs`
  - Passed.

## Playwright Evidence

Screenshots captured:

- `.task_tmp/equation-corpus-scan2/screenshots/rational-exclusion-card.png`
- `.task_tmp/equation-corpus-scan2/screenshots/radical-rejection-card.png`
- `.task_tmp/equation-corpus-scan2/screenshots/periodic-family-card.png`
- `.task_tmp/equation-corpus-scan2/screenshots/unsupported-exp-log-card.png`

## Notes

- `npm run build` was attempted for the visual gate and failed before Vite build because existing tracked TypeScript files outside this lane currently have errors in `src/app/runtime/historyDisplayEntry.test.ts`, `src/lib/modes/equation/equation-corpus-algtrig-fixes.test.ts`, and `src/lib/modes/equation/symbolic-parameterized-exact.ts`. Those files had no local diff from this scan2 checkpoint at the time of failure.
- The Playwright visual gate therefore used a temporary Vite dev-server config under `.task_tmp/equation-corpus-scan2/playwright.visual.config.ts`.
- During Playwright, unrelated source files changed in the worktree from another lane; they were not staged for this checkpoint.
- The recurring Node warning about `NO_COLOR` being ignored when `FORCE_COLOR` is set appeared during commands and was non-fatal.
