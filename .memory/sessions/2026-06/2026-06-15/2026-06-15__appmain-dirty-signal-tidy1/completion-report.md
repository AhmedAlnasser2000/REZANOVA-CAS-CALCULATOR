# APPMAIN-DIRTY-SIGNAL-TIDY1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Remove lint friction from the AppMain calculator-memory dirty signal without changing autosave behavior.

## What Changed

- Replaced the empty-object dirty signal with a named object that references the same persistence-relevant AppMain inputs.
- Destructured `useAppPersistenceDirtySignal` arguments before the effect dependency list.
- Updated Supercarrier app-runtime docs and same-commit memory records.

## Boundaries

No calculator-memory snapshot, dirty coverage, autosave timing, schema, HistoryEntry, Tauri command, OOE, solver, Display, bus, Surface Protocol, or runtime behavior changed.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: APPMAIN-DIRTY-SIGNAL-TIDY1.
