## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

# APP-MEMORY1 Completion Report

## Summary

- Added calculator-memory autosave settings with memory enabled by default, settled-change autosave by default, and a configurable interval clamped to 20 seconds minimum.
- Added versioned calculator-memory snapshots for settings, history, variables, and `Ans`.
- Desktop Tauri stores calculator memory in the existing `calculator-state.json`; browser preview uses `localStorage` fallback key `rezanova-classwiz-calculator:app-state:v1`.
- First launch now starts with empty Calculate/Equation editors, and DisplayPanel editor placeholders use readable plain text.
- Added separate Settings actions for `Reset History` and `Reset Calculator Memory`.
- 2026-05-27 follow-up fixed live desktop restore so legacy invalid history entries inside saved calculator memory are dropped without discarding the rest of the saved session.
- 2026-05-27 user-review follow-up changed the restore boundary to core-only memory: saved drafts, result cards, routes, and workbench session state are no longer restored, so startup opens a clean empty Calculate editor while history/settings/variables/`Ans` remain durable.
- 2026-05-27 polish set the browser/Tauri visible app title to `REZANOVA CLASSWIZ CALCULATOR`.

## Boundaries

- No parser, solver, result schema, history replay, OOE, or job-cancellation behavior changed.
- Manual save prompts are deferred; APP-MEMORY1 uses autosave plus close-flush.
- Heavy previous sessions remain available through History replay rather than startup restore.
- Tauri identifier remains unchanged.
