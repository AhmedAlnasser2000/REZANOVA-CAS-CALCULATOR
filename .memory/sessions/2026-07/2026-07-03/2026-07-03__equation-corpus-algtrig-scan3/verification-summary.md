# EQUATION-CORPUS-ALGTRIG-SCAN3 Verification Summary

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

- `npx vite-node .task_tmp/equation-corpus-scan3/run-openstax-next250.ts --write-ledger`
  - Passed; wrote 250 scan3 run rows, 250 unique rows, 60 duplicate rows, and 52 scan3 findings.
  - Result: 198 supported, 40 wrong-result, 12 unsupported.
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
  - Passed; 5 tests.
- `node tools/validate-equation-corpus-ledger.mjs`
  - Passed; ledger has 10 sources, 450 unique cases, 100 duplicate records, 474 run results, and 76 scan findings.
- `git diff --check -- benchmarks/equation-corpus/ledger tools/validate-equation-corpus-ledger.test.mjs`
  - Passed.
- `npx playwright test --config .task_tmp/equation-corpus-scan3/playwright.visual.config.ts`
  - Final run passed; 4 browser tests using the real Equation UI.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --check -- benchmarks/equation-corpus/ledger tools/validate-equation-corpus-ledger.test.mjs .memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan3`
  - Passed.
- `npx eslint tools/validate-equation-corpus-ledger.test.mjs`
  - Passed.

## Playwright Evidence

Screenshots captured and visually inspected:

- `.task_tmp/equation-corpus-scan3/screenshots/rational-composition-exclusions.png`
- `.task_tmp/equation-corpus-scan3/screenshots/trig-quadratic-normalization-issue.png`
- `.task_tmp/equation-corpus-scan3/screenshots/formula-constraint-readability.png`
- `.task_tmp/equation-corpus-scan3/screenshots/unsupported-system-error-card.png`

## Notes

- The first Playwright attempt timed out while waiting for the configured Vite web server. A direct `npx vite --host 127.0.0.1 --port 4173 --strictPort` startup succeeded; the manual dev server was stopped after the passing visual run.
- A follow-up Playwright attempt reached the app and exposed two brittle assertions (`Exclusions` versus the visible `Valid when`, and plain `Z` versus the visible integer-parameter wording). The spec was corrected to the actual UI text and then passed.
- The scan3 generator initially attempted duplicate canonical cases (`x^2+4=0`, `x^4-13x^2+36=0`, and several direct trig cases). The duplicate guard prevented ledger writes until those candidates were replaced with unique cases.
- The recurring Node warning about `NO_COLOR` being ignored when `FORCE_COLOR` is set appeared during commands and was non-fatal.
