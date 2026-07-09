# FORMULA-VIEWER-TAB-FOUNDATION1 Completion Report

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
- Scope: session-only Formula Viewer tab foundation for huge structured formula `caseMath` answers.

## Summary

Huge formula answers can now stay compact in the source result and open a dedicated in-app Formula Viewer tab. The viewer is a tab/page surface over structured Display blocks, not a calculator mode, solver route, OOE job, or persisted schema.

## Completed

- Added a session-only `formula-viewer` workspace kind without adding it to `ModeId`.
- Added `FormulaViewerArtifact` construction from structured Display blocks, including source context, copy payload, primary `caseMath` rows, grouped details, and global facts.
- Added formula-viewer workspace instance creation/focus/reuse by artifact result signature.
- Added a Formula Viewer page with Copy Result, Back to source, and the existing compact/progressive/row-budget case rendering path inside its own scroll surface.
- Updated heavy source `caseMath` cards to offer `Open Formula Viewer` when the app shell provides an opener.
- Kept Display, History, Copy Result, To Editor, OOE, app-state, Tauri, solver behavior, and persisted schemas unchanged.
- Extracted the AppMain viewer gate into a small helper to keep the file-size ratchet satisfied.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-26.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__formula-viewer-tab-foundation1/`
