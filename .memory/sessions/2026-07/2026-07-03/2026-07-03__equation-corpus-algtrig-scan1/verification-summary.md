# EQUATION-CORPUS-ALGTRIG-SCAN1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

Passed:

- `npx vite-node .task_tmp/equation-corpus-scan1/run-openstax-batch.ts --write-ledger`
- `node --test tools/validate-equation-corpus-ledger.test.mjs && node tools/validate-equation-corpus-ledger.mjs`
- `npx eslint tools/validate-equation-corpus-ledger.test.mjs`
- `npm run test:memory-protocol`
- `git diff --check -- benchmarks/equation-corpus/ledger tools/validate-equation-corpus-ledger.test.mjs .memory/current-state.md .memory/journal/2026-07/2026-07-03.md .memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan1`

Evidence:

- Validator result: 10 sources, 50 unique cases, 0 duplicate records, 50 run results, 6 scan findings.
- Dry-run solver result before manual benchmark classification: 49 of 50 cases produced a solver success; four cases are still marked `needs-upgrade` because success was not benchmark-sufficient or Exact mode stopped.
- The validator unit test was updated after the corpus stopped being an empty scaffold.
- The recurring `NO_COLOR`/`FORCE_COLOR` warning appeared during Node-based runs and did not affect exit status.

Notes:

- Full repo gates were not run because other agents have unrelated active dirty work in memory and Calculus/integration lanes.
