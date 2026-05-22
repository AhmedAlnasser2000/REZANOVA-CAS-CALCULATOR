# Completion Report: ASSUMPTIONS-POLISH1 + DOMAIN-GRAPH-READY0

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Status
- date: 2026-05-22
- status: implemented, verified locally, not committed

## Summary

Implemented the visible fact-detail polish and the first shared domain sampling readiness slice in one coordinated run.

## Completed Work

- Added a default-off `Detailed Facts` setting and settings-panel toggle.
- Added a display-layer result-detail policy that keeps assumption readback concise by default and exposes full checked-source/trust wording only when detailed facts are enabled.
- Added `domain-sampling-readiness` as a reusable internal helper for Table and future graphing-readiness surfaces.
- Updated Table mode to use the shared helper while preserving rows, warnings, and output behavior.
- Recorded `domain-sampling-readiness` in the internal capability readiness table.

## Boundaries Preserved

- No math, solver, calculus, parser, table-row, graphing, Labs, or source-mirror behavior changes.
- No new result origin, strategy badge, history schema, or public assumptions mode.
- Graph readiness is internal infrastructure only; no graph UI was added.
