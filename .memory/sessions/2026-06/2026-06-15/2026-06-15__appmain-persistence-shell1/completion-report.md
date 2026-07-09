# APPMAIN-PERSISTENCE-SHELL1 Completion Report

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

Extract AppMain persistence/bootstrap mechanics into an app-runtime hook while keeping AppMain as the visual and cross-mode orchestrator.

## What Changed

- Added `src/app/runtime/useAppPersistenceRuntime.ts` for app bootstrap load, runtime label hydration, settings persistence, calculator-memory snapshot restore/reset, variable-memory state, and stored-variable callbacks.
- Added `useAppPersistenceDirtySignal` so AppMain can report broad runtime-draft changes without owning autosave internals.
- Updated `AppMain.tsx` to consume the new persistence hook and to use reset delegates through refs.
- Removed AppMain's direct `src/lib/app-state/tauri` bootstrap imports and direct `src/lib/algebra/variable-memory-store.ts` import.
- Added focused hook UI tests for bootstrap restore, fallback bootstrap, settings persistence, variable mutation, reset behavior, and dirty signaling.

## Boundaries

- Did not change schemas, HistoryEntry shape, calculator-memory shape, Tauri commands, stored-variable parsing, replay/history behavior, solver behavior, Display policy, OOE behavior, bus work, Surface Protocol, or runtime semantics.
- Kept broader app-runtime access to `src/lib/app-state/tauri` for a later persistence-seam commit.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: APPMAIN-PERSISTENCE-SHELL1.

## Follow-Ups

- Add the narrow app-state persistence seam and then tighten the AppMain bootstrap validator exception.
