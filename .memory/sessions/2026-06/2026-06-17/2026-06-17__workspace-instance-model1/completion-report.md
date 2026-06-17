# WORKSPACE-INSTANCE-MODEL1 Completion Report

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

Added the first internal workspace-instance model for future browser-style tabs. The model is session-only and invisible: the app still renders one active mode through the existing singleton `currentMode`.

## Changes

- Added pure workspace-instance helpers under app runtime for create/focus/latest-kind/create, rename, duplicate, close, close-others, final-tab fallback, and placeholder state clearing.
- Added `useWorkspaceInstancesRuntime` to own session instance state and shadow existing mode changes.
- Wired `AppMain` lightly so existing `setMode` activates a matching workspace instance and external `currentMode` changes are synchronized.
- Updated the workspace-tabs roadmap, current-state snapshot, journal, and session memory.

## Scope Guard

No visible tabs, OOE `workspaceInstanceId`, History schema, pending-ticket shape, diagnostics event shape, persistence schema, projects/files, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, multiple `AppMain` trees, or hidden mounted workspace trees were added.
