# WORKSPACE-ACTIVE-SURFACE-HOST1 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate
- label: ui
- scope: explicit active surface host for calculator and Formula Viewer surfaces.

## Completed
- Added `ActiveSurfaceHost` as the active-tab renderer boundary.
- Routed calculator-like workspaces through the existing calculator shell surface.
- Moved Formula Viewer rendering out of `.calculator-shell` into a page surface.
- Preserved Formula Viewer as session-only: no Order of Execution runtime context, no job launch, and no `currentMode` change.
- Removed the old Formula Viewer gate wrapper.

## Durable Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-01.md`
- `.memory/sessions/2026-07/2026-07-01/2026-07-01__workspace-active-surface-host1/`
