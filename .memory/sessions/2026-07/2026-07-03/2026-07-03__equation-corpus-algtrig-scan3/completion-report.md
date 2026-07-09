# EQUATION-CORPUS-ALGTRIG-SCAN3 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`EQUATION-CORPUS-ALGTRIG-SCAN3` expands the Equation benchmark corpus with the next 250 OpenStax Algebra/Trig-style equation cases.

What changed:

- Added unique runnable cases `eq.openstax.algtrig.0201` through `eq.openstax.algtrig.0450`.
- Added one run result per new unique case under `run_id: 2026-07-03-openstax-algtrig-scan3`.
- Added 60 duplicate source sightings from OpenStax College Algebra 2e, all mapped back to canonical runnable cases so duplicates are not rerun.
- Added 52 new open scan findings from the 250-case sweep.
- Updated the ledger validator unit expectation to accept the expanded committed scaffold.

Scan3 result:

- 250 unique cases scanned.
- 198 supported.
- 40 wrong-result or needs-upgrade.
- 12 unsupported.
- 60 duplicate sightings recorded as non-runnable duplicate records.

Main observed gaps:

- Special-angle trig normalization remains the largest readback/output gap: 18 cases returned inverse-trig forms where the source family expects reduced unit-circle angles.
- Exact trig/power outputs can still leak decimal fragments: 6 cases returned decimal pieces inside exact output, including the visible `2\sin^2(x)-1=0` case.
- Systems are not an Equation selected-target capability yet: 8 system cases correctly remain unsupported in this corpus lane.
- Nested composition/preimage cases remain incomplete: 3 cases were unsupported, including `f(g(x))=0` and a nested log-exp exact case.
- Some formula/rational/radical cases solve but need stronger normalization of equivalent constraints, cancelled-hole evidence, rejected candidates, or root counts.

Visual evidence:

- Playwright captured real UI screenshots for rational composition exclusions, trig quadratic normalization debt, formula constraint readability, and unsupported systems error cards in `.task_tmp/equation-corpus-scan3/screenshots/`.

Boundaries preserved:

- No solver implementation changes in this checkpoint.
- No runtime application code changes.
- No duplicate rows were used as runnable targets.
- Temporary scan and Playwright harnesses stay under `.task_tmp/equation-corpus-scan3/`.
- Unrelated active shared memory and Calculus/integration edits from other agents were left unstaged.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan3/completion-report.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan3/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan3/commit-log.md`

## Memory Scope Note

- Existing shared `.memory/current-state.md`, `.memory/journal/2026-07/2026-07-03.md`, and related shared memory files already had unrelated active edits from another lane while this checkpoint was recorded. This session dossier records the scan3 state to avoid overwriting or staging another agent's memory changes.
