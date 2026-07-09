# INTEGRATION-RATIONAL-PF-PERF-SPLIT-AUDIT0 Completion Report

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

- Split the former monolithic rational partial-fractions integration regression into focused named tests: linear, repeated-linear, mixed linear/quadratic, repeated-quadratic per case, numerator-over-quadratic per case, and stop/overlap precedence.
- Preserved the same success/stop/strategy assertions and did not add integration rules.
- Recorded per-case timing evidence showing the long suite cost is concentrated in exact verification/equivalence for nonsquare and completed-square repeated-quadratic arctan outputs.

## Scope Kept Out

- No integration rule widening.
- No verifier/cache optimization yet.
- No public Rubi metadata.
- No public Calculus strategy/result schema changes.
- No Display, History, OOE, Tauri, persistence, workspace, or UI changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-27.md`
- `.memory/research/roadmaps/rubi-integration-roadmap.md`
- `.memory/sessions/2026-06/2026-06-27/2026-06-27__integration-rational-pf-perf-split-audit0/`
