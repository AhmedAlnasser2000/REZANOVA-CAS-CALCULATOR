# WORKSPACE-RUNTIME-STATUS-HOST1 Completion Report

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

Runtime/editor status is now scoped to the active workspace tab instead of leaking across all visible tabs.

## Changes

- Added `WorkspaceRuntimeState` for DisplayPanel-facing runtime state.
- Added `useWorkspaceRuntimeStateHostRuntime` to capture/restore active-tab runtime state.
- Added `useActiveWorkspaceRuntimeStatus` so active-tab status/notice timers stay outside `AppMain`.
- Added workspace-instance runtime-state update helpers.
- Routed tab focus, tab creation, duplicate, close, close-others, clear-tab-state, and same-tab retarget through runtime-state capture/restore.
- Scoped pending `Computing` / `Stopping` labels to the active `workspaceInstanceId`.
- Removed DisplayPanel's dependency on app-wide React transition pending for visible status.
- Prevented non-active tab Stop actions from applying `Stop requested` to the active tab header.

## Boundaries

- No OOE authority changes.
- No OOE event type, diagnostics schema, committed History schema, or persistence changes.
- No mode-launcher context menu, default-new-tab setting, projects/files, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.
