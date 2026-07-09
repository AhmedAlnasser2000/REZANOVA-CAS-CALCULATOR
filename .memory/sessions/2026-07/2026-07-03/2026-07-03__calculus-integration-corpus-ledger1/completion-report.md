# CALCULUS-INTEGRATION-CORPUS-LEDGER1 Completion Report

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

`CALCULUS-INTEGRATION-CORPUS-LEDGER1` creates the first lane-scoped Calculus benchmark corpus.

What changed:

- Added `benchmarks/calculus-corpus/README.md` to define Calculus benchmark lane boundaries.
- Added `benchmarks/calculus-corpus/integration/` for indefinite integration benchmarks only.
- Added an integration source registry with local textbook PDFs and the approved APEX, LibreTexts/OpenStax, and DLMF web references.
- Added empty unique-case, duplicate-case, run-result, and scan-finding JSONL ledgers.
- Added an integration-specific schema requiring `integral_kind: "indefinite"`.
- Added `visual_status` as a required run-result field so app-visible benchmark runs must record Playwright visual verification state.
- Added a validator and tests for source integrity, lane scoping, duplicate-to-canonical mapping, run-once-per-sweep enforcement, definite-case rejection, and visual-status enforcement.

Boundaries preserved:

- No runtime application code changes.
- No solver behavior changes.
- No benchmark cases populated yet.
- No definite, improper, ODE, multivariable, limits, or differentiation cases added.
- DLMF is registered as a reference source, not a first-pass advanced genus benchmark batch.
- The prior visual-output policy and Equation corpus duplicate-documentation changes remain scoped and are included in the same commit lane.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-03.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__calculus-integration-corpus-ledger1/completion-report.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__calculus-integration-corpus-ledger1/verification-summary.md`
- `.memory/sessions/2026-07/2026-07-03/2026-07-03__calculus-integration-corpus-ledger1/commit-log.md`
