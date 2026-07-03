# EQUATION-CORPUS-ALGTRIG-SCAN2 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

`EQUATION-CORPUS-ALGTRIG-SCAN2` expands the Equation benchmark corpus with the next 150 OpenStax Algebra/Trig-style equation cases.

What changed:

- Added unique runnable cases `eq.openstax.algtrig.0051` through `eq.openstax.algtrig.0200`.
- Added one run result per new unique case under `run_id: 2026-07-03-openstax-algtrig-scan2`.
- Added 40 duplicate source sightings from OpenStax College Algebra 2e, all mapped back to canonical runnable cases so duplicate cases are not rerun.
- Added 18 new open scan findings from the 150-case sweep.
- Updated the ledger validator unit expectation to accept the expanded committed scaffold.

Scan2 result:

- 150 unique cases scanned.
- 132 supported.
- 15 unsupported.
- 3 wrong-result.
- 40 duplicate sightings recorded as non-runnable duplicate records.

Main remaining gaps:

- Selected exact exponential/log normalization still misses fractional common-base powers and shifted/scaled natural exponential equations such as `16^x=8`, `e^{x-2}=5`, and `4e^{-x}=9`.
- A small absolute-value branch slice needs better carrier handling, including affine absolute-value equations and variable-side branch validation.
- Several trig identity/product cases still need normalization to full periodic families; some return finite principal answers or require interval numeric fallback instead of symbolic periodic output.
- The currently supported rational, radical, polynomial, selected-target formula, complex quadratic, direct log-domain, and many direct/affine trig cases are now represented in the ledger.

Visual evidence:

- Playwright captured real UI screenshots for rational exclusion, radical rejection, periodic family, and unsupported exp-log answer/error cards in `.task_tmp/equation-corpus-scan2/screenshots/`.

Boundaries preserved:

- No solver implementation changes in this checkpoint.
- No runtime application code changes.
- No duplicate rows were used as runnable targets.
- Temporary scan and Playwright harnesses stay under `.task_tmp/equation-corpus-scan2/`.
- Unrelated active memory-history and Calculus/source edits from other agents were left unstaged.

## Durable Memory Updated

- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan2/completion-report.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan2/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-algtrig-scan2/commit-log.md`

## Memory Scope Note

- Existing `.memory/current-state.md` and `.memory/journal/2026-07/2026-07-03.md` had unrelated active edits from the memory-history cleanup lane while this checkpoint was being recorded. This dossier records the scan2 state to avoid overwriting or staging another agent's memory changes.
