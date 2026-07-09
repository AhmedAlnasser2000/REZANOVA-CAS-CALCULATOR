# WORKSPACE-RUNTIME-STOP-CONTROL-FIX1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Fixed Display header Stop for active hosted runtime work after manual QA showed a hard Calculus derivative could continue running while the header Stop button became disabled.
- Added a scoped runtime-ticket stop helper to `useHistoryDisplayRuntime`.
- Routed header Stop through the active workspace pending runtime ticket before falling back to the older editor-analysis cancellation lane.
- Routed Restart Editor through the same pending runtime-ticket stop attempt before remounting/restarting editor analysis.
- Let DisplayPanel receive an explicit Stop disabled state so active runtime work can keep Stop available even when editor analysis has already been paused.

## Scope Notes

- App-shell/runtime wiring only.
- No solver behavior changes.
- No OOE ownership, host routing, stale-gate, commit/drop, or diagnostics authority changes.
- No broad runtime bus, host merge, Surface Protocol, plugin layer, graphing work, or workspace page work.

## Follow-Up

- Restart Editor now cancels the hard Calculus runtime, but a live smoke showed the Calculus derivative field retaining the expression after restart. This is recorded as a separate open question because it is distinct from the runtime cancellation bug.
