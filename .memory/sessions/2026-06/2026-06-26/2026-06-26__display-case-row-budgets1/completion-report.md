# DISPLAY-CASE-ROW-BUDGETS1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- Gate label: ui
- Scope: Display row render budgets for expanded heavy formula `caseMath` answers.

## Summary

Expanded heavy formula answers no longer mount giant case rows automatically. Heavy `caseMath` answers still start compact and expand progressively, but any individual row above the render-cost budget becomes an opt-in placeholder until the user chooses `Show formula row`.

## Completed

- Added a Display-owned row-cost policy for formula, condition, group-label, and expensive-token LaTeX cost.
- Added over-budget row placeholders that show row number/cost context and preserve row-local-condition semantics without mounting formula or condition math.
- Kept cheap rows on the existing immediate/progressive render path.
- Reset row expansion state when the result signature changes.
- Refactored deferred `MathStatic` so symbolic-display normalization is not run before the deferred placeholder.
- Routed formula-case detail sections through the same `caseMath` compact, lazy, and row-budgeted display path as answer blocks.
- Added a replay fallback that parses raw generated `\substack` case LaTeX into structured, non-persisted `caseMath` rows when older/replayed payloads lack structured case metadata.
- Extracted caseMath render controls into a display-panel helper to keep the file-size ratchet satisfied.
- Extracted caseMath display-block tests into a dedicated test file to keep the file-size ratchet satisfied.
- Added unit/UI coverage for row budgets, per-row opt-in rendering, deferred math behavior, Copy Result stability, and small-case regressions.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-26.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__display-case-row-budgets1/`
