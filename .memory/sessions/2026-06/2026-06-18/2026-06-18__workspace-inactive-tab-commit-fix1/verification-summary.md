# WORKSPACE-INACTIVE-TAB-COMMIT-FIX1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Passing

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/app/runtime/workspace-origin-input-revision.test.ts src/app/runtime/workspace-instances.test.ts src/lib/ooe/job-launch/job-contract.test.ts src/lib/ooe/runtime-control/runtime-coordinator.test.ts`
- `npm run test:ui -- src/app/runtime/useWorkspaceDisplayStateHostRuntime.ui.test.tsx src/app/runtime/useWorkspaceStateHostRuntime.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run test:ui -- src/app/runtime/useTableRuntime.ui.test.tsx`
- `npm run test:compartments-boundaries`
- `npm run test:ooe-boundaries`
- `npm run test:source-mirrors`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `git status --short`

## Notes

- Manual dev-app verification confirmed the workspace-tab result leak is fixed: a result launched from one tab no longer appears in the tab that happens to be active when the job finishes.
- The repeated `NO_COLOR` / `FORCE_COLOR` warning appeared during Node/Vitest commands and did not fail the gates.
- `npm run build` completed with existing Vite dynamic/static import chunking warnings for `active-job-registry`, `algebra-transform`, and `modes/equation`.
