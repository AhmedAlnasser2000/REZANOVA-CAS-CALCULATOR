# WORKSPACE-DISPLAY-STATE-HOST1 Completion Report

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

Added workspace-instance scoped Display state so visible results, `Ans`, and replay display fragments belong to the tab that produced them instead of leaking across every open tab.

## Completed

- Added a workspace display-state model for `displayOutcome`, `ansLatex`, and replay display/substitution fragments.
- Added `useWorkspaceDisplayStateHostRuntime` to capture outgoing display state and restore incoming tab display state.
- Extended workspace-instance model operations with display-state updates and duplicate display-state copying.
- Extended `useHistoryDisplayRuntime` with display-state capture/restore and origin-aware commit behavior.
- Updated inactive-origin commits so they update the origin instance's saved Display/Ans state without switching tabs or changing the active visible Display.
- Kept active-origin commits using the existing visible Display behavior while mirroring that state into the active instance.
- Wired AppMain tab focus, duplicate, close, close-others, and clear-tab-state through the display-state host.
- Added AppMain regression coverage proving Calculate and Equation tab results remain isolated.

## Non-Goals Preserved

- No committed History schema change.
- No per-instance committed History.
- No projects/files, saved tab sessions, mode-launcher context menu, Graphing, Spreadsheet, broad bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.
