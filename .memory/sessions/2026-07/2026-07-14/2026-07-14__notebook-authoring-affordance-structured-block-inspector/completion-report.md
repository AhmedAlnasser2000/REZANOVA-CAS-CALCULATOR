# Notebook Affordances And Structured-Block Inspector

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

## Program Boundary

- Notebook-only UI and app-owned document work under `NotebookPage`, `src/app/shell/notebook/**`, `src/lib/notebook/**`, and Notebook styles/tests.
- Media, uploads, assets, wrapping, crop, rotation, final white-document convergence, custom IDs, and reader-specific initial-collapse state remain out of scope.
- Display, History, app-state, Tauri, Surface Protocol, solvers, Order of Execution, `AppMain`, and `ActiveSurfaceHost` remain untouched.
- Concurrent Matrix/History work and untracked `test-results/` are excluded. The Notebook-facing result-projection pause remains in force.

## Gates

| Gate | Kind | Status |
| --- | --- | --- |
| `NOTEBOOK-AUTHORING-AFFORDANCE-FIXES1` | ui | verified; selective commit approved |
| `NOTEBOOK-STRUCTURED-BLOCK-INSPECTOR1` | ui | pending; not started |

## NOTEBOOK-AUTHORING-AFFORDANCE-FIXES1 Outcome

- List style menus show familiar marker sequences, and the paragraph-style menu communicates typographic hierarchy plus the role of each heading level.
- Exactly one empty, unformatted paragraph is pristine; structural insertions hide both onboarding prompts.
- The editing caret and Inspector target are separate. A single click inside structured content inspects the nearest enclosing shell, while direct math selection takes precedence.
- Inspector visibility now distinguishes auto, manual, pinned, and collapsed behavior. Manual restore remains visible and presents the approved empty-state guidance when nothing is inspectable.
- Gate 2 remains unopened until the approved Gate 1 selective commit is created.
