# Notebook Interaction And File-Management Repair Program

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: v10_contract_audit; crop_persistence_fix; v10_media_ui_audit; v10_scope_review; v10_playwright_update; gate4_video; gate4_audit; gate4_native_video; gate4_final_review
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
| `NOTEBOOK-DIRECT-MEDIA-AND-INDENT1` | ui/document | verified; committed `e271a87d` |
| `NOTEBOOK-LIBRARY-FILE-OPERATIONS1` | ui/backend | verified; committed by this checkpoint |
| `NOTEBOOK-VIDEO-PLAYBACK-SHELL1` | ui | verified; committed by this checkpoint |

## Current Handoff

- The first gate has a focused, body-portaled floating layer for Notebook transient menus, the current Notebook title in the internal strip, and truthful Section hierarchy actions.
- The current `selection.ts` correction selects inserted math nodes before focus activation, avoiding a narrow-layout viewport-hydration race that hid Math Authoring after equation insertion.
- Focused UI, TypeScript, lint, file-size, diff, and Chromium evidence are recorded in `gate-notebook-transient-chrome-repairs1.md`.
- V10 now persists paragraph left indentation, arbitrary image rotation/display aspect ratio, and video placement while adding direct image/video resize, image crop/rotation, snap-and-wrap drag feedback, insertion guides, and contextual status coordinates without persisted X/Y state. Evidence is recorded in `gate-notebook-direct-media-and-indent1.md`.
- Library records now support deliberate selection, context actions, bounded bulk Trash/Restore/Delete, safe duplicate/rename rules, and destination-picker exports. Desktop writers receive only opaque save handles and stream through sibling temporary files; browser preview uses File System Access when available or an explicit download fallback. Evidence is recorded in `gate-notebook-library-file-operations1.md`.
- Video playback now uses a Notebook-owned accessible control bar, one mounted media element, readable decode-error fallback, theater mode, and browser/Tauri fullscreen presentation without changing V10 persistence. A request-owned entry lock keeps a stale fullscreen request from clobbering a later transition. Chromium and final packaged WebKitGTK evidence pass with the real WebM, opaque range URL, seek, theater, fullscreen/Escape, double-entry handling, and one mounted video node.
