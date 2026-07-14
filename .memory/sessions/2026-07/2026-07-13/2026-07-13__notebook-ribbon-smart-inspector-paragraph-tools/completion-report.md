# Notebook Ribbon, Smart Inspector, And Paragraph Tools

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

- Notebook-only UI program: `NotebookPage`, `src/app/shell/notebook/**`, `src/lib/notebook/**`, and Notebook styles/tests.
- Active output-inversion, Display, History, app-state, Tauri, Surface Protocol, Model Context Protocol, solver, clipboard, `AppMain`, and `ActiveSurfaceHost` lanes remain untouched.
- Live evidence, History attachment, package, and result-derived Notebook content remain paused until output inversion publishes a stable Notebook-facing projection.

## Gates

| Gate | Kind | Status |
| --- | --- | --- |
| `NOTEBOOK-RIBBON-ARCHITECTURE1` | ui | verified; committed in this checkpoint |
| `NOTEBOOK-SMART-INSPECTOR1` | ui | verified; committed in this checkpoint |
| `NOTEBOOK-PARAGRAPH-TOOLS1` | ui | pending |

## NOTEBOOK-SMART-INSPECTOR1 Outcome

- Added per-tab `auto`, `pinned`, and `collapsed` inspector state without changing the Notebook document/package contract.
- `auto` opens for math, sections, and academic containers and yields the canvas for ordinary prose or no active block.
- The Outline remains manual-only. Collapsed desktop rails release their grid width; narrow drawers remain mutually exclusive.
- Academic-container headers and empty bodies select on one click while editable content remains directly accessible.
- The output-inversion pause remains unchanged. `NOTEBOOK-PARAGRAPH-TOOLS1` is the next program gate.
