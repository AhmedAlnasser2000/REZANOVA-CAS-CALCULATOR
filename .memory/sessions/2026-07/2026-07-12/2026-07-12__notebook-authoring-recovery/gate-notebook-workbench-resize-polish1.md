# NOTEBOOK-WORKBENCH-RESIZE-POLISH1 Gate

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

## Scope

- Made the Notebook workbench use the available app stage with per-tab outline and inspector resizing, writing-first empty state, and template action below the initial caret.
- Kept in-text MathLive visually seamless while retaining Separate Equation's explicit card boundary.
- Corrected toolbar insertion so it waits for the real inserted node, activates its Notebook Math Authoring surface, and keeps template insertion at a caret rather than a selected placeholder range.
- Marked Notebook prose as a local calculator-keyboard exclusion and made possible-math conversion review-only after explicit selection.

## Verification

- UI gate: `npm run test:ui -- src/app/shell/NotebookPage.ui.test.tsx src/app/shell/notebook/math-field/NotebookMathField.ui.test.tsx src/app/shell/notebook/NotebookWorkbench.ui.test.tsx src/AppMain.workspace-tabs.ui.test.tsx` passed: 4 files, 28 tests.
- `npm run lint`, `npm run test:memory-protocol`, and `git diff --check` passed.
- Source Chromium check through the Vite development server confirmed toolbar insertion opens the Notebook Math Authoring surface and a Fraction inserts `\\frac{\\placeholder{}}{\\placeholder{}}` with collapsed selection and no MathLive contains-highlight background. Screenshot: `.task_tmp/NOTEBOOK-WORKBENCH-RESIZE-POLISH1/inline-toolbar-autofocus-final.png`.
- `npm run test:file-sizes` is blocked only by concurrent output-inversion file `src/lib/modes/equation/symbolic.ts` at 929 lines against its 900-line cap; no Notebook file is reported.
- Production build/preview cannot be refreshed while concurrent output-inversion typing fails in `src/lib/equation/parameterized/carrier.ts` and `src/lib/modes/equation/outcomes.ts`; this gate used the live source server instead. No output-inversion file was edited.

## Shared-Tree Boundary

- Staging excludes active output-inversion/result-document files and untracked `test-results/`.
- Live evidence, History attachment, packages, import/export, and result-derived Notebook content remain paused until output inversion publishes a stable Notebook-facing result projection.
