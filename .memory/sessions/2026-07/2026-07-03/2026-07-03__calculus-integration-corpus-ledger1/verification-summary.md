# CALCULUS-INTEGRATION-CORPUS-LEDGER1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

Passed:

- `node tools/validate-calculus-integration-corpus-ledger.mjs`
- `node --test tools/validate-calculus-integration-corpus-ledger.test.mjs`
- `npx eslint tools/calculus-integration-corpus-ledger-core.mjs tools/validate-calculus-integration-corpus-ledger.mjs tools/validate-calculus-integration-corpus-ledger.test.mjs`
- `node tools/validate-equation-corpus-ledger.mjs`
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
- `npm run test:memory-protocol`
- `git diff --check -- AGENTS.md benchmarks/equation-corpus/README.md benchmarks/equation-corpus/schemas/ledger-schema.md benchmarks/calculus-corpus tools/calculus-integration-corpus-ledger-core.mjs tools/validate-calculus-integration-corpus-ledger.mjs tools/validate-calculus-integration-corpus-ledger.test.mjs .memory/current-state.md .memory/decisions.md .memory/journal/2026-07/2026-07-03.md .memory/sessions/2026-07/2026-07-03/2026-07-03__visual-output-verification-policy1 .memory/sessions/2026-07/2026-07-03/2026-07-03__calculus-integration-corpus-ledger1`

Notes:

- The ledger currently validates 8 sources, 0 unique cases, 0 duplicate records, 0 run results, and 0 scan findings.
- No Playwright run was needed for this scaffold because no app-visible output was changed or benchmarked. The schema requires future app-visible benchmark runs to record visual verification status.
- The Equation corpus validator was run because this commit also carries the earlier scoped duplicate-run wording for Equation corpus docs.
- The recurring `NO_COLOR`/`FORCE_COLOR` warning appeared during Node and ESLint runs and did not affect exit status.
