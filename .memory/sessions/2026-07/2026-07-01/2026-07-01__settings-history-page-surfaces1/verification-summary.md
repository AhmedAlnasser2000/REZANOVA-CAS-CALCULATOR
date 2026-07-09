## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

Passed:

- `npm run test:ui -- src/app/runtime/workspace-surfaces.test.ts src/app/runtime/workspace-instances.test.ts src/app/runtime/useWorkspaceTabsShellRuntime.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx src/app/shell/ActiveSurfaceHost.ui.test.tsx src/app/shell/SettingsPage.ui.test.tsx src/app/shell/HistoryPage.ui.test.tsx src/components/SettingsPanel.ui.test.tsx src/components/HistoryPanel.ui.test.tsx`
- `npm run test:ui -- src/AppMain.workspace-tabs.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Notes:

- The first file-size run failed because `src/AppMain.tsx` had 3360 lines against a cap of 3357 after wiring the page surfaces.
- The AppMain wiring was compacted without raising baselines; the final file-size run passed with `src/AppMain.tsx` at exactly 3357 lines.
- Targeted UI/runtime coverage now proves page-surface classification, singleton Settings behavior, protected page-tab actions, Formula Viewer separation, Settings full-page patching through the existing settings handler, History virtualization, timeline/search/workspace filtering, selected-entry actions, pending stop controls, and no Formula Viewer-from-record action.

## Pending

- User approved committing this checkpoint on 2026-07-02; commit metadata is recorded in `commit-log.md`.
