# CALCULUS-INTEGRATION-NEXT350-STUDY1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Backend Gate

Passed:

- `node .task_tmp/calculus-integration-next350/generate-next350-candidates.mjs`
- `npx tsx .task_tmp/calculus-integration-next350/backend-next350-sweep.ts`
- `node .task_tmp/calculus-integration-next350/promote-next350-ledger.mjs`
- `node tools/validate-calculus-integration-corpus-ledger.mjs`
- `node --test tools/validate-calculus-integration-corpus-ledger.test.mjs`

Backend evidence:

- Candidate report: `.task_tmp/calculus-integration-next350/next350-candidates-report.json`
- Backend run rows: `.task_tmp/calculus-integration-next350/next350-backend-run-results.jsonl`
- Backend summary: `.task_tmp/calculus-integration-next350/next350-backend-summary.json`
- Unsupported row extract: `.task_tmp/calculus-integration-next350/next350-backend-unsupported.jsonl`

Backend result:

- Total cases: 350.
- Supported cases: 282.
- Controlled unsupported cases: 68.
- Run id: `2026-07-04-calculus-integration-next350-app-backend1`.

## Playwright Visual Gate

Passed with all 350 rows visually checked:

- `npx playwright test visual-next350-survey.spec.ts --config .task_tmp/calculus-integration-next350/playwright.visual.config.ts` for the early segmented sweep.
- `npx playwright test visual-next350-per-case.spec.ts --config .task_tmp/calculus-integration-next350/playwright.visual.config.ts` for the verified per-case sweep and focused retry rows.
- `node .task_tmp/calculus-integration-next350/record-next350-visual-run.mjs`
- `node tools/validate-calculus-integration-corpus-ledger.mjs`

Visual evidence:

- Aggregate visual rows: `.task_tmp/calculus-integration-next350/next350-visual-results-complete.jsonl`
- Screenshots: `.task_tmp/calculus-integration-next350/visual-evidence/`
- Visual run id: `2026-07-04-calculus-integration-next350-visual1`.

Observed visual result:

- 350 of 350 rows had `visual_status: visually-verified`.
- 282 rows rendered success answer cards.
- 68 rows rendered controlled error cards.
- 0 rows recorded readability issues in the focused visual sweep.
- Playwright caught an early backend mismatch when the lower-level dispatcher marked a row unsupported while the app rendered a success card; the backend sweep was corrected to use the app-level Calculus evaluator.

## Ledger Gate

Passed:

- `node tools/validate-calculus-integration-corpus-ledger.mjs`
- `node --test tools/validate-calculus-integration-corpus-ledger.test.mjs`

Ledger state after promotion:

- Sources: 8.
- Unique cases: 550.
- Duplicate sightings: 17.
- Run results: 911.
- Scan findings: 68.

## Final Checks

Passed:

- `npm run test:memory-protocol`
- `git diff --check -- benchmarks/calculus-corpus/integration tools/validate-calculus-integration-corpus-ledger.test.mjs .memory`

Commit requested on 2026-07-05 as a path-scoped commit because the shared worktree contains unrelated dirty work from other lanes.
