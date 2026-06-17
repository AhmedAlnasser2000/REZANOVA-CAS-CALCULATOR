# WORKSPACE-ACTIVE-TAB-MODE-SWITCH1 Completion Report

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

Normal mode selection now behaves like same-tab browser navigation: it retargets the active workspace instance instead of focusing or creating another tab.

## Changes

- Added `titleSource` and `navigationRevision` to workspace instances.
- Added active-tab retarget helpers to the workspace-instance model and runtime hooks.
- Routed normal `setMode` selection through active-tab retargeting.
- Preserved explicit tab actions for separate tab creation/focus.
- Threaded workspace-instance revisions through OOE job identity, commit assessment, launch-ticket context, and pending-ticket metadata.
- Made retargeted same-tab jobs stale-drop when their launch revision no longer matches the current instance revision.
- Updated current memory and the workspace-tabs roadmap with the active-tab navigation record.

## Boundaries

- No visible tab layout changes.
- No committed History schema changes.
- No projects/files, Graphing, Spreadsheet, bus, Surface Protocol, runtime registry, plugin layer, or multi-window behavior.
