# Notebook Durable Media, Pages, And Publication Program

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

- Twelve sequential Notebook milestones from large-document readiness through Web publication.
- One verified milestone commit per named gate; the user approved all twelve commits on 2026-07-14.
- No push is authorized. Untracked `test-results/` and unrelated workspace work remain excluded.
- Display, History, solver, OOE, Surface Protocol, `AppMain`, and `ActiveSurfaceHost` ownership remain unchanged.

## Status

| Gate | Kind | Status |
| --- | --- | --- |
| `NOTEBOOK-LARGE-DOCUMENT-READINESS1` | ui | committed `4e275f06` |
| `NOTEBOOK-PERSISTENCE-FOUNDATION1` | backend | committed `a1c2b708` |
| `NOTEBOOK-DOCUMENT-LIBRARY1` | ui | committed `98530d12` |
| `NOTEBOOK-RIBBON-TABS1` | ui | committed `64f3b955` |
| `NOTEBOOK-IMAGE1` | ui | verified; standing commit approval |
| `NOTEBOOK-PAGE-LAYOUT1` | ui | pending |
| `NOTEBOOK-IMAGE-LAYOUT1` | ui | pending |
| `NOTEBOOK-VIDEO1` | ui | pending |
| `NOTEBOOK-EXPORT-PROJECTION1` | backend | pending |
| `NOTEBOOK-EXPORT-PDF1` | ui | pending |
| `NOTEBOOK-EXPORT-DOCX1` | backend | pending |
| `NOTEBOOK-EXPORT-WEB1` | backend | pending |

## Current Handoff

- `NOTEBOOK-IMAGE1` meets its focused model, persistence, Rust, UI, responsive Chromium, production-build, and repository gates.
- Notebook documents now use strict V7 image figures backed by durable content-addressed assets. PNG, JPEG, static WebP, and safe static SVG are accepted; animated, executable, external-reference, unsupported, or over-budget content is rejected before document mutation.
- Picker, clipboard, and drag/drop insertion are one undoable document change, Picture Format is contextual, accessibility details are explicit, and only captioned figures enter Outline.
- The next implementation gate is `NOTEBOOK-PAGE-LAYOUT1` after this standing-approved selective commit.
