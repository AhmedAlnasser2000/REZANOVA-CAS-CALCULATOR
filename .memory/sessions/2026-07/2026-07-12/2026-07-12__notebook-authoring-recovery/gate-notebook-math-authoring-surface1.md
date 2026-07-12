# NOTEBOOK-MATH-AUTHORING-SURFACE1 Gate

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

- The active Notebook math field opens one draggable Math Authoring surface in compact field-tools mode and expands that same surface into symbol categories.
- Surface position is clamped below app tabs, retained per Notebook tab for the session, and remains outside the document/package contract.
- User-facing keys are symbol-first; accessible names and searchable categories remain available while MathLive insertion recipes stay internal.
- Notebook suppresses MathLive's native menu through its public menu API after mount and redirects right-click activation to the REZANOVA surface without changing calculator MathLive behavior.
- Matrix insertion uses a keyboard-accessible 8 by 8 dimension picker with square brackets, hover/focus announcements, arrow-key movement, and insertion for all 64 supported sizes.
- Escape dismisses Matrix picker, expanded symbol keyboard, and compact field tools one level at a time while the active math field remains selected.

## Evidence

- `registry.test.ts`: 4 passed for symbol keycaps, safety classes, and all 64 matrix dimensions.
- `NotebookMathField.ui.test.tsx`, `NotebookAuthoringKeyboard.ui.test.tsx`, and `NotebookPage.ui.test.tsx`: 21 passed.
- `npx tsc -b --pretty false`: passed.
- Targeted Notebook ESLint: passed.
- `npm run build`: passed with existing chunk-size warnings only.
- Chromium desktop and 1,100-pixel checks passed for compact placement and tab clearance; unified compact, symbol, matrix, and right-click behavior passed.
- Desktop screenshots for compact and expanded 4 by 5 matrix-picker states were inspected under `.task_tmp/NOTEBOOK-MATH-AUTHORING-SURFACE1/`.

## Shared-Tree Boundary

- Only Notebook page/components/styles/tests/browser evidence and this program's memory hunks belong to this commit.
- Active output-inversion/result-contract/History files and untracked `test-results/` remain excluded.
- Live evidence, History attachment, package, import/export, and result-derived Notebook work remain paused until a stable Notebook-facing result projection exists.
