# NOTEBOOK-AUTHORING-AFFORDANCE-FIXES1 Gate

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
- scope: list/heading discoverability, structural onboarding, editing-versus-inspection targeting, and Inspector visibility semantics

## Outcome

- Bullet choices preview disc, circle, square, and dash; numbering previews decimal, lower-alpha, and lower-Roman sequences without changing split-button, selection, list-style, nesting, or undo semantics.
- Normal and Heading 1 through Heading 3 form a selection-preserving typographic gallery with Body text, Main topic, Section, and Subsection descriptions plus current and Mixed trigger states.
- Onboarding remains visible only for one empty, unformatted paragraph and disappears after an empty academic container or Section is inserted.
- One click inside structured content preserves the editing caret while inspecting the nearest academic container or Section; a directly selected math block wins over its container.
- Auto, manual, pinned, and collapsed Inspector modes are explicit. Manual restore shows the approved empty state when no target exists, and both rails remain side-correct and independent.

## Evidence

- Focused Notebook UI: 4 files, 31 tests passed.
- Incremental TypeScript, Notebook-scoped ESLint, and file-size validation passed.
- Chromium screenshots and geometry checks under `.task_tmp/NOTEBOOK-AUTHORING-AFFORDANCE-FIXES1/` cover 2400px, 1440px, and 1100px plus 80%/130% scaling and forced colors.
- Browser checks verify marker previews, heading descriptions, 12 visible academic-container choices, structural onboarding dismissal, one-click targeting, manual empty Inspector, right-anchored narrow drawer, canvas-contained menus, and Math Authoring exclusion.

## Boundaries

- No document-version, structured-block appearance/collapse, media, final white-document, Display, History, app-state, Tauri, Surface Protocol, solver, Order of Execution, `AppMain`, or `ActiveSurfaceHost` change.
- The Notebook-facing result-projection pause remains in force.
