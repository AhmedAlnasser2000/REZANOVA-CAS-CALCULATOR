# Notebook Interaction And File-Management Repair Program

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Boundary

- Four sequential repair gates after the separate formatter-only `RUSTFMT-CLEANUP1` commit `53451819`.
- Preserve the existing Notebook architecture, the app-level tab strip, snap-and-wrap media placement, and `test-results/` exclusion.
- No solver, OOE, History, app-state schema, `AppMain`, or `ActiveSurfaceHost` ownership changes.
- Each named gate needs its own explicit commit approval; no push is authorized.

## Status

| Gate | Kind | Status |
| --- | --- | --- |
| `NOTEBOOK-TRANSIENT-CHROME-REPAIRS1` | ui | verified; committed by this checkpoint |
| `NOTEBOOK-DIRECT-MEDIA-AND-INDENT1` | ui/document | pending |
| `NOTEBOOK-LIBRARY-FILE-OPERATIONS1` | ui/backend | pending |
| `NOTEBOOK-VIDEO-PLAYBACK-SHELL1` | ui | pending |

## Current Handoff

- The first gate has a focused, body-portaled floating layer for Notebook transient menus, the current Notebook title in the internal strip, and truthful Section hierarchy actions.
- The current `selection.ts` correction selects inserted math nodes before focus activation, avoiding a narrow-layout viewport-hydration race that hid Math Authoring after equation insertion.
- Focused UI, TypeScript, lint, file-size, diff, and Chromium evidence are recorded in `gate-notebook-transient-chrome-repairs1.md`.
