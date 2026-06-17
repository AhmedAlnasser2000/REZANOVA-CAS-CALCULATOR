# WORKSPACE-ACTIVE-TAB-MODE-SWITCH1 Verification Summary

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
- `npm run test:unit -- src/app/runtime/workspace-instances.test.ts src/lib/ooe/job-launch/job-contract.test.ts src/lib/ooe/job-launch/launch-tickets.test.ts`
- `npm run test:unit -- src/app/runtime/workspace-instances.test.ts src/lib/ooe/job-launch/job-contract.test.ts src/lib/ooe/runtime-control/runtime-coordinator.test.ts`
- `npm run test:ui -- src/app/runtime/useWorkspaceInstancesRuntime.ui.test.tsx src/app/runtime/useWorkspaceStateHostRuntime.ui.test.tsx`
- `npm run test:ui -- src/app/runtime/useWorkspaceInstancesRuntime.ui.test.tsx src/app/runtime/useWorkspaceStateHostRuntime.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx src/AppMain.ui.test.tsx`
- `npm run test:ui -- src/AppMain.workspace-tabs.ui.test.tsx`
- `npm run test:file-sizes`

## Pending At Record Time

- `npm run test:memory-protocol` and `git diff --check` are run immediately before commit.
