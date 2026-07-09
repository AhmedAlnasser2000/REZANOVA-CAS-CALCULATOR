# EQUATION-CORPUS-LEDGER1 Completion Report

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

`EQUATION-CORPUS-LEDGER1` starts the Equation benchmark corpus as a runtime-free repository asset.

What changed:

- Added `benchmarks/equation-corpus/` with a source registry for the local textbook folder and Equation-relevant web references.
- Added JSONL ledgers for unique runnable cases, duplicate source sightings, run results, and scan findings.
- Documented the sweep-first policy: failing cases are classified and scanning continues.
- Added a schema document with controlled vocabularies for support status, missing capability, upgrade needs, parser gaps, readback-only issues, and performance concerns.
- Added a Node validator that rejects duplicate records pointing at unknown cases, run results aimed at duplicate records, and repeated runs for the same `run_id` plus `case_id`.

Boundaries preserved:

- No runtime application code changes.
- No Equation solver behavior changes.
- No package script changes.
- No committed textbook excerpts or copied problem statements.
- Unrelated dirty memory and Calculus/integration work from other agents was left untouched except for the required durable-memory notes for this milestone.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-03.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-ledger1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-ledger1/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__equation-corpus-ledger1/commit-log.md`
