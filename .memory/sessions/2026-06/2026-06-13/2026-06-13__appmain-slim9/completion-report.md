# APPMAIN-SLIM9 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Extract Guide-owned route, selection, and content derivation from AppMain while preserving AppMain as the cross-mode orchestration root.

## What Changed

- Added `src/app/runtime/useGuideRuntime.ts`.
- Moved Guide route state, per-route selection state, route/list/article/mode-ref/search derived values, Guide soft-menu entries, parent/back navigation, search query updates, Guide open helpers, and reset behavior into the hook.
- Rewired `src/AppMain.tsx` to consume the hook while keeping `launchGuideExample`, mode-specific Guide shortcuts, launcher/history dispatch, clipboard, and mode switching in AppMain.
- Added `src/app/runtime/useGuideRuntime.ui.test.tsx` for the extracted hook boundary.
- Ratcheted `tools/file-size-baseline.json` for `src/AppMain.tsx`.

## Boundaries

- No solver/core changes.
- No schema changes.
- No Guide content, route ID, workspace prop, display contract, OOE behavior, or class-name changes.
- No global reducer, event bus, appFlowHandlers extraction, or shared generic workspace hook.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:ui -- src/app/runtime/useGuideRuntime.ui.test.tsx` passed.
- `npm run test:ui -- src/AppMain.ui.test.tsx` passed.
- `npm run lint` passed.
- `node tools/validate-file-sizes.mjs --update-baseline`, then `npm run test:file-sizes` passed.

## Size Ratchet

- `src/AppMain.tsx`: 5,374 -> 5,203 lines.
- `src/app/runtime/useGuideRuntime.ts`: 267 lines.
- `src/app/runtime/useGuideRuntime.ui.test.tsx`: 179 lines.
- `tools/file-size-baseline.json` lowered the `src/AppMain.tsx` cap to 5,203.

## Follow-Ups

- Continue with `APPMAIN-CALCULUS-RUNTIME1` as one real commit after internal diff-only gates.
