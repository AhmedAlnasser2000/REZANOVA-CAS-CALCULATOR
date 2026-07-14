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
| `NOTEBOOK-AUTHORING-AFFORDANCE-FIXES1` | ui | committed as `8e966e65` |
| `NOTEBOOK-STRUCTURED-BLOCK-INSPECTOR1` | ui | verified; selective commit approved |

## NOTEBOOK-AUTHORING-AFFORDANCE-FIXES1 Outcome

- List style menus show familiar marker sequences, and the paragraph-style menu communicates typographic hierarchy plus the role of each heading level.
- Exactly one empty, unformatted paragraph is pristine; structural insertions hide both onboarding prompts.
- The editing caret and Inspector target are separate. A single click inside structured content inspects the nearest enclosing shell, while direct math selection takes precedence.
- Inspector visibility now distinguishes auto, manual, pinned, and collapsed behavior. Manual restore remains visible and presents the approved empty-state guidance when nothing is inspectable.
- Gate 1 is committed as `8e966e65`.

## NOTEBOOK-STRUCTURED-BLOCK-INSPECTOR1 Outcome

- The app-owned Notebook document contract is version 6 with strict version-5 validation, continuous migrations from versions 1 through 6, and loss-preserving version-5 migration that removes only historically ignored incompatible collapse flags.
- Academic containers and Sections persist optional six-digit accent colors, explicit collapsibility overrides, and compatible current collapsed state through the Tiptap adapter.
- The Inspector separates Identity, Appearance, Behavior, and Arrangement. Appearance offers Automatic, six named presets, a custom picker, contrast guidance, and reset; Behavior has one Collapsible switch.
- Automatic collapsibility remains Hint/Answer for academic containers and enabled for Sections. Explicit overrides survive type changes, while incompatible current collapse state is cleared.
- Only the structured-block header chevron changes persisted collapsed state; Outline controls remain navigation-only.
- Both pre-media gates are complete. Media remains a separately planned document-version milestone and is not implemented here.
