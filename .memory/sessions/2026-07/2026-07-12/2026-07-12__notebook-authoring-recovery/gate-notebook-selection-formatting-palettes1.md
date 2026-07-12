# NOTEBOOK-SELECTION-FORMATTING-PALETTES1 Gate

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

- gate_kind: ui
- status: passed
- date: 2026-07-12

## Verified Behavior

- Pointer selection autoscroll is bounded to the Notebook canvas and prevents page-level runaway scrolling.
- A non-empty prose range opens a compact contextual toolbar; Bold and Italic restore the exact range.
- Text Color and Highlight use separate palettes with curated swatches, recent colors, custom colors, reset, and a non-blocking low-contrast warning.
- One Escape closes the child palette before the toolbar, without clearing the prose selection.
- Prose marks operate on text nodes and do not implicitly color embedded MathLive nodes.

## Evidence

- `NotebookSelectionToolbar.ui.test.tsx`: 3 passed for exact range marks, separate palettes/reset, and nested Escape selection preservation.
- `NotebookPage.ui.test.tsx`: 12 passed with existing authoring, hierarchy, transient, and math behavior intact.
- `npx tsc -b --pretty false`: passed.
- Targeted Notebook ESLint: passed.
- `npm run build`: passed with existing chunk-size and mixed static/dynamic import warnings only.
- Chromium `Notebook keeps prose formatting palettes close to the selected text`: passed after a real pointer drag at 1,440 by 1,000; toolbar geometry remained inside the Notebook canvas and the captured palette was visually inspected.

## Shared-Tree Boundary

- Only Notebook page/components/styles/tests/browser evidence and this program's memory hunks belong to this commit.
- Active output-inversion tool files and untracked `test-results/` remain excluded.
- Live evidence, History attachment, package, import/export, and result-derived Notebook work remain paused until a stable Notebook-facing result projection exists.
