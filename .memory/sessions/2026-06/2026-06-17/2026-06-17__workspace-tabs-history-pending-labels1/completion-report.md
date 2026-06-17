# WORKSPACE-TABS-HISTORY-PENDING-LABELS1 Completion Report

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

Added launch-time tab labels to pending History rows so simultaneous workspace-tab jobs are distinguishable without changing committed History truth.

## Completed

- Render pending/running/stopping History rows with `Tab: <launch label>` when the pending ticket carries `workspaceInstanceLabel`.
- Kept finalized History rows unchanged and workspace-based.
- Added UI coverage proving pending rows show the tab label while committed rows do not.
- Added runtime coverage proving tab renames after launch do not mutate the pending ticket label.
- Updated current-state, the workspace-tabs roadmap, and the daily journal.

## Non-Goals Preserved

- No committed `HistoryEntry` schema change.
- No tab title persistence in finalized History.
- No per-instance committed History.
- No projects/files, saved tab sessions, mode-launcher context menu, Graphing, Spreadsheet, broad bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.
