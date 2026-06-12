# APPMAIN-SLIM7 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Extract the Statistics-owned AppMain runtime/UI state cluster into a focused hook while preserving AppMain as the cross-mode orchestration root.

## What Changed

- Added `src/app/runtime/useStatisticsRuntime.ts`.
- Moved Statistics screen/menu state, dataset/frequency/source-sync state, probability/inference/point-set state, draft state, refs, derived route/menu values, draft helpers, Guide example loading, History replay restoration, current/full reset helpers, and `runStatisticsAction` into the hook.
- Rewired `src/AppMain.tsx` to consume the hook while keeping launcher/Guide/history dispatch, display commits, shell panels, app memory, keyboard routing, and cross-mode orchestration in AppMain.
- Added `src/app/runtime/useStatisticsRuntime.ui.test.tsx` for the extracted hook boundary.
- Ratcheted `tools/file-size-baseline.json` for `src/AppMain.tsx`.

## Boundaries

- No solver/core changes.
- No schema changes.
- No Statistics capability, OOE plan, worker host, history/replay payload, display contract, route ID, workspace prop, or class-name changes.
- No global reducer, event bus, appFlowHandlers extraction, or shared generic workspace hook.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/statistics/navigation.test.ts src/lib/statistics/parser.test.ts src/lib/statistics/core.test.ts src/lib/statistics/engine.test.ts src/lib/statistics/inference.test.ts src/app/logic/primaryActionRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/expressionRouting.test.ts` passed.
- `npm run test:ui -- src/app/runtime/useStatisticsRuntime.ui.test.tsx src/AppMain.ui.test.tsx` passed.
- `npm run lint` passed.
- `node tools/validate-file-sizes.mjs --update-baseline`, then `npm run test:file-sizes` passed.

## Size Ratchet

- `src/AppMain.tsx`: 6,957 -> 6,221 lines.
- `src/app/runtime/useStatisticsRuntime.ts`: 878 lines, below the default 900-line cap.
- `tools/file-size-baseline.json` lowered the `src/AppMain.tsx` cap to 6,221.

## Follow-Ups

- Continue with `APPMAIN-SLIM8` as the Geometry runtime/UI hook extraction in a separate commit.
