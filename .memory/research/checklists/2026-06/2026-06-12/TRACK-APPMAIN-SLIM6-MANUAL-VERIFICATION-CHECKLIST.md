# TRACK-APPMAIN-SLIM6 Manual Verification Checklist

Milestone: `APPMAIN-SLIM6`
Date: 2026-06-12
Agent: codex
Model: gpt-5

## Scope

- [x] Extract Trigonometry runtime/UI state from `src/AppMain.tsx` into `src/app/runtime/useTrigonometryRuntime.ts`.
- [x] Keep AppMain as the orchestration root for mode routing, Guide/history handoffs, display commits, shell panels, and app-wide memory.
- [x] Preserve Trigonometry workspace props and public UI class names.
- [x] Preserve `trigonometry.evaluate`, worker/fallback host IDs, launch-ticket behavior, stale gates, schemas, and history/replay payloads.
- [x] Add focused hook UI coverage for draft, seed/example, commit, stale, cancellation, and reset behavior.
- [x] Ratchet AppMain's file-size baseline downward.

## Verification

- [x] TypeScript static check passed.
- [x] Focused Trigonometry unit tests passed.
- [x] Hook UI test passed.
- [x] AppMain UI test passed.
- [x] Lint passed.
- [x] Build passed.
- [x] File-size ratchet passed.
- [x] Memory protocol passed.

## Deferred

- [ ] Equation composition district split.
- [ ] Algebra district moves.
- [ ] Any future `APPMAIN-SLIM7` extraction.
- [ ] Global reducer/event-bus/platform architecture work.
