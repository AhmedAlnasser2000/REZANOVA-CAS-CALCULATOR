# NOTEBOOK-RIBBON-RAIL-FIXES1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- kind: ui
- status: verified
- scope: desktop Outline layout/accessibility repair and one paragraph-style selector

## Outcome

- Desktop Outline collapse removes the pane and resizer from layout and accessibility exposure, releases the canvas width, and leaves Inspector state untouched.
- Outline remains left-owned and Inspector right-owned across close and restore sequences. The existing narrow drawer component remains available below the desktop breakpoint.
- Normal and Heading 1 through Heading 3 share one selection-preserving transient menu. Mixed selections report a neutral state, and Normal converts selected headings back to paragraphs without changing section or academic-container controls.

## Evidence

- Focused Notebook UI: 2 files, 20 tests passed.
- Incremental TypeScript, Notebook-scoped ESLint, file-size validation, memory validation, and diff hygiene passed.
- Chromium screenshots and geometry checks cover 2400px, 1440px, and 1100px plus 80%/130% scaling and high contrast under `.task_tmp/NOTEBOOK-RIBBON-RAIL-FIXES1/`.

## Boundaries

- No document-version, paragraph-formatting, list-style, media, Display, History, app-state, Tauri, Surface Protocol, Model Context Protocol, solver, Order of Execution, `AppMain`, or `ActiveSurfaceHost` changes.
- The Notebook-facing result-projection pause remains in force.
