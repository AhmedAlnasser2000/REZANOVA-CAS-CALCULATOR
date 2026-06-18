# WORKSPACE-TABS-JOB-LIFECYCLE-FIX1 Completion Report

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

Workspace tabs now distinguish navigation invalidation from explicit cancellation. Same-tab mode switches make older jobs obsolete by revision, but do not stop them; tab switching leaves origin-tab work running.

## Changes

- Removed the `requestWorkspaceTabJobCancellation` call from same-tab retarget in `useWorkspaceTabsShellRuntime`.
- Left close-tab, close-others, and Stop-tab cancellation paths intact in `useWorkspaceTabsRuntime`.
- Made tab job summaries ignore pending tickets and active jobs whose workspace-instance revision no longer matches the current instance revision.
- Made active DisplayPanel pending status requests include the active workspace-instance revision.
- Extended `useHistoryDisplayRuntime` pending status filtering to honor `workspaceInstanceRevision`.
- Added focused hook coverage proving retarget and tab focus do not cancel, old-revision jobs stale-drop, and explicit close/Stop still cancel.

## Boundaries

- No OOE event type, host, schema, diagnostics wording, committed History schema, persistence, solver, Display rendering, Surface Protocol, bus, runtime registry, plugin, project/file, Graphing, Spreadsheet, or multi-window changes.
