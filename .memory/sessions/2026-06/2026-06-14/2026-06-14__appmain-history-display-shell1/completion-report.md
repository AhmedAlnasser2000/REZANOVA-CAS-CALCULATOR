# APPMAIN-HISTORY-DISPLAY-SHELL1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Extract the AppMain-owned History/Display lifecycle into a state-owning shell hook while preserving AppMain as the cross-mode orchestrator.

## What Changed

- Added `src/app/runtime/useHistoryDisplayRuntime.ts`.
- Added `src/app/runtime/historyDisplayEntry.ts` for pure HistoryEntry construction.
- Added `src/app/runtime/useHistoryDisplayRuntime.ui.test.tsx`.
- Rewired `src/AppMain.tsx` to consume the hook for History state, pending History tickets, `displayOutcome`, `ansLatex`, `commitOutcome`, replay display restoration, ticket Stop requests, and memory History/Display restore.
- Updated `docs/architecture/appmain-orchestrator-surface-audit.md` with the final split record.
- Updated `.memory/current-state.md` and this session dossier.
- Lowered `src/AppMain.tsx` in `tools/file-size-baseline.json` from 4213 to 3357 lines.

## Boundaries

- Structure-only extraction.
- AppMain still owns mode switching, settings, variable memory, launcher state, Guide dispatch, command routing, side surfaces, workspace runtime construction, and DisplayPanel prop assembly.
- No HistoryEntry schema, pending-ticket schema, solver behavior, Display readback wording, OOE policy, replay compatibility, mode naming, Guide behavior, or command-routing behavior changed.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: APPMAIN-HISTORY-DISPLAY-SHELL1.

## Follow-Ups

- Plan `APPMAIN-COMMAND-ROUTING-SHELL1` as the next AppMain slimming slice if the next goal is primary action, soft action, keypad, and window-key routing cleanup.
- Keep Display model assembly, dormant app-logic cleanup, and DisplayPanel audit as separate follow-ups.
