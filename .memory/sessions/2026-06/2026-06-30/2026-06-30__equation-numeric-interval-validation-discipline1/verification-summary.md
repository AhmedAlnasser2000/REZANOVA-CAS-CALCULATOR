## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate: ui

Focused verification run:

- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/runtime/useEquationRuntime.ui.test.tsx src/lib/display/result/display-blocks.test.ts src/lib/display/scheduling/formula-viewer-virtualization.test.ts src/app/shell/DisplayPanel.ui.test.tsx src/app/shell/FormulaViewerPage.ui.test.tsx src/lib/modes/equation/answer-modes.test.ts`
- `npm run test:ui -- src/app/runtime/useEquationRuntime.ui.test.tsx src/app/shell/DisplayPanel.ui.test.tsx src/app/shell/FormulaViewerPage.ui.test.tsx`

Observed result:

- Runtime/controller tests passed with the compact `Enable Numeric Interval` policy.
- UI tests passed for non-auto-opening periodic guidance, explicit panel enablement, Display answer collapsibility, and Formula Viewer answer collapse.
- Equation answer-mode tests passed with the interval missing-value wording updated to the existing Run/F1/EXE workflow.

Final gates before commit:

- Passed: `npm run build`
- Passed: `npm run lint`
- Passed: `npm run test:file-sizes`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`
