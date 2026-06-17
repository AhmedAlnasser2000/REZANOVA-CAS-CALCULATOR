# WORKSPACE-STATE-HOST1 Completion Report

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

Added the first active-only workspace state host behind the invisible workspace-instance model. The app still renders as one active singleton mode, but Calculate, Equation, and Calculus now expose surface-state capture/restore adapters that the host uses when switching workspace kinds.

## Implemented

- Extended workspace instances with a surface-state slot update helper.
- Added `useWorkspaceStateHostRuntime` for capture-before-focus and restore-on-active-instance changes.
- Added Calculate surface snapshots for editor latex, screen/menu state, algebra tray, replay substitutions, integral/limit workbench, and shared derivative quickform state.
- Added Equation surface snapshots for latex, solve target, screen/menu state, algebra tray, numeric solve panel, polynomial coefficients, polynomial system latex, and linear systems.
- Added Calculus surface snapshots for screen/menu state and guided workbench states.
- Wired AppMain mode switching through the host while keeping `currentMode` as the live behavior source.

## Preserved Boundaries

- No visible tabs.
- No OOE `workspaceInstanceId`.
- No per-instance Display or committed History.
- No persistence or schema changes.
- No projects/files, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, plugin layer, or command authority.
