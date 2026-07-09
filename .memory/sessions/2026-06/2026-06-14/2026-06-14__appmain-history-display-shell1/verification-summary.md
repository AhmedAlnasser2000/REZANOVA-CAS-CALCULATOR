# APPMAIN-HISTORY-DISPLAY-SHELL1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

`APPMAIN-HISTORY-DISPLAY-SHELL1` extracts AppMain History/Display state and lifecycle behavior into a state-owning hook with mode-specific delegates injected from AppMain.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:ui -- src/app/runtime/useHistoryDisplayRuntime.ui.test.tsx`
- `npm run test:ui -- src/AppMain.ui.test.tsx src/AppMain.status.ui.test.tsx`
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/logic/editorRuntimeControl.test.ts src/lib/ooe/job-launch/*.test.ts src/lib/ooe/runtime-control/*.test.ts`
- `npm run lint`
- `npm run build`
- `node tools/validate-file-sizes.mjs --update-baseline`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Inspection Evidence

- `src/AppMain.tsx`: 3357 lines after extraction.
- `src/app/runtime/useHistoryDisplayRuntime.ts`: 405 lines.
- `src/app/runtime/historyDisplayEntry.ts`: 141 lines.
- `src/app/runtime/useHistoryDisplayRuntime.ui.test.tsx`: 476 lines.
- File-size ratchet lowered `src/AppMain.tsx` from 4213 to 3357 lines.

## Outcome

- TypeScript, focused hook UI coverage, AppMain UI/status coverage, runtime/OOE adjacency unit tests, lint, build, file-size, memory-protocol, and diff whitespace checks passed.
- Vite build emitted non-fatal dynamic/static import chunk warnings for existing mixed import paths, including the active-job registry now dynamically imported from the extracted hook.

## Outstanding Gaps

- `APPMAIN-COMMAND-ROUTING-SHELL1`, `APPMAIN-DISPLAY-MODEL-SHELL1`, dormant app-logic cleanup, and `DISPLAY-PANEL-SURFACE-AUDIT0` remain future work.
