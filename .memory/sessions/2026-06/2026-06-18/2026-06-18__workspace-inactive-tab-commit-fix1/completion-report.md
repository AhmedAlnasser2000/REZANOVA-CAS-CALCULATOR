# WORKSPACE-INACTIVE-TAB-COMMIT-FIX1 Completion Report

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

- Fixed the remaining workspace-tabs job lifecycle bug where switching away from a running origin tab could make its still-open job stale-drop against the currently visible tab.
- Added a shared origin-instance input-revision resolver that keeps legacy jobs active-editor based, uses live requests for the active visible origin, and reconstructs inactive origin revisions from saved workspace surface state.
- Threaded the resolver through shared runtime launches plus Calculate, Equation, Calculus, Table, Trigonometry, Statistics, and Geometry OOE-backed paths.
- Preserved same-tab retarget stale-drop through workspace-instance `navigationRevision`.
- Preserved explicit cancellation for close/Stop actions.
- Fixed the tab display leak by removing passive visible-display mirroring into the active tab and making completed outcomes write only to their origin workspace instance.
- Captured the sharper manual finding: the job could be associated with the correct workspace instance while async completion still rendered into the currently active screen. The fix freezes launch workspace context for ticket/runtime commit routing and uses ref-backed live runtime context getters so completion writes to the launch/origin instance, not whichever tab is active later.
- Fixed the source-mirror CI failure by removing the concrete `playground/sources` path literal from the production compartment manifest.

## Scope Notes

- No visible tab UX changes.
- No committed History schema changes.
- No projects/files, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.
