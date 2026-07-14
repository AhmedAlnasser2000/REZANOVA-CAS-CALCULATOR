# NOTEBOOK-STRUCTURED-BLOCK-INSPECTOR1 Gate

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
- scope: Notebook V6 structured-block appearance, collapsibility, Inspector controls, rendering, and persistence

## Outcome

- Version 6 adds optional lowercase six-digit accent color and explicit collapsibility to academic containers and Sections while retaining compatible persisted collapsed state.
- Strict V5/V6 validation and continuous V1-V6 migrations preserve older visible behavior and remove historically ignored incompatible collapse flags.
- Automatic collapsibility is Hint/Answer for academic containers and enabled for Sections. Explicit overrides persist across type changes; disabling collapsibility clears current collapsed state.
- Academic containers expose type, number, and label; Sections expose title. Both expose Automatic, six presets, custom color, reset, contrast guidance, one Collapsible switch, and move controls.
- Accent affects only the left rail/border, icon emphasis, and subtle header tint. Bodies remain neutral, and forced-colors mode uses system colors.
- The header chevron alone changes persisted collapsed state; Outline entries remain navigation and reordering surfaces.

## Evidence

- Document/model tests: 10 files, 33 tests passed.
- Focused Notebook UI: 3 files, 27 tests passed.
- Incremental TypeScript, Notebook-scoped ESLint, file-size validation, the production build, and diff hygiene passed.
- Chromium screenshots and geometry/state checks under `.task_tmp/NOTEBOOK-STRUCTURED-BLOCK-INSPECTOR1/` cover 2400px, 1440px, 1100px, 80%/130% scaling, and forced colors.

## Boundaries

- No media, uploads, assets, crop, rotation, wrapping, white-document convergence, custom IDs, or reader-specific initial-collapse state.
- No Display, History, app-state, Tauri, Surface Protocol, solver, Order of Execution, `AppMain`, or `ActiveSurfaceHost` change.
- The Notebook-facing result-projection pause remains in force.
