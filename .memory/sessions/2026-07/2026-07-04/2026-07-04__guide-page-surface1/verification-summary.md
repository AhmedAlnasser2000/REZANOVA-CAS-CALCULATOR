## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- gate_label: ui
- milestone: `GUIDE-PAGE-SURFACE1`

## Passed

- `npm run test:ui -- src/AppMain.workspace-tabs.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx src/app/shell/ActiveSurfaceHost.ui.test.tsx src/app/runtime/useWorkspaceTabsShellRuntime.ui.test.tsx src/app/runtime/useGuideRuntime.ui.test.tsx`
- `npm run test:unit -- src/app/runtime/workspace-instances.test.ts src/app/runtime/workspace-surfaces.test.ts`
- `npm run test:file-sizes` passed before later unrelated `src/lib/input/input-canonicalization.ts` work appeared in the shared checkout.
- `npm run test:memory-protocol`
- `git diff --check`
- Playwright visual QA against dev server `http://127.0.0.1:1421/`:
  - `.task_tmp/GUIDE-PAGE-SURFACE1/guide-page-desktop.png`
  - `.task_tmp/GUIDE-PAGE-SURFACE1/guide-page-narrow.png`

## Visual Evidence

- Desktop Guide page active: `calculator-shell` count `0`, `side-surface-host` count `0`; tablist above page surface, Guide page at `{ x: 28, y: 126, width: 1564, height: 846 }`.
- Narrow Guide page active: `calculator-shell` count `0`, `side-surface-host` count `0`; content scrolls vertically without calculator-shell containment.

## Known Unrelated Failure

- `npx tsc -b --pretty false` fails in currently dirty Equation/history-replay files outside this Guide slice:
  - `src/app/runtime/useEquationRuntime.ts`
  - `src/app/runtime/useEquationRuntime.ui.test.tsx`
  - `src/lib/equation/equation-history.ts`
  - `src/types/calculator/equation-replay-types.ts`
  - `src/types/calculator/runtime-types.ts`
- Final rerun of `npm run test:file-sizes` failed on unrelated `src/lib/input/input-canonicalization.ts`, which is dirty outside this Guide slice and currently exceeds the default cap.

## Pending Before Commit

- final staged-diff inspection
