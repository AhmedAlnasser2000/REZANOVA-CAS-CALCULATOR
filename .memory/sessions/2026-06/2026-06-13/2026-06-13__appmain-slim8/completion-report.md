# APPMAIN-SLIM8 Completion Report

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

Extract the Geometry-owned AppMain runtime/UI state cluster into a focused hook while preserving AppMain as the cross-mode orchestration root.

## What Changed

- Added `src/app/runtime/useGeometryRuntime.ts`.
- Moved Geometry screen/menu state, shape and coordinate form state, draft state, refs, derived route/menu values, draft helpers, solve-missing templates, Guide seed/example loading, History replay restoration, current/full reset helpers, and `runGeometryAction` into the hook.
- Rewired `src/AppMain.tsx` to consume the hook while keeping launcher/Guide/history dispatch, display commits, shell panels, app memory, keyboard routing, and cross-mode orchestration in AppMain.
- Added `src/app/runtime/useGeometryRuntime.ui.test.tsx` for the extracted hook boundary.
- Ratcheted `tools/file-size-baseline.json` for `src/AppMain.tsx`.

## Boundaries

- No solver/core changes.
- No schema changes.
- No Geometry capability, OOE plan, worker host, history/replay payload, display contract, route ID, workspace prop, or class-name changes.
- No global reducer, event bus, appFlowHandlers extraction, or shared generic workspace hook.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/geometry/navigation.test.ts src/lib/geometry/parser.test.ts src/lib/geometry/shapes.test.ts src/lib/geometry/circles.test.ts src/lib/geometry/core.test.ts src/lib/geometry/coordinate.test.ts src/lib/geometry/triangles.test.ts src/lib/modes/geometry-worker-runtime.test.ts src/app/logic/primaryActionRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/expressionRouting.test.ts` passed.
- `npm run test:ui -- src/app/runtime/useStatisticsRuntime.ui.test.tsx src/app/runtime/useGeometryRuntime.ui.test.tsx src/AppMain.ui.test.tsx` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `node tools/validate-file-sizes.mjs --update-baseline`, then `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- `src/AppMain.tsx`: 6,221 -> 5,374 lines.
- `src/app/runtime/useGeometryRuntime.ts`: 795 lines, below the default 900-line cap.
- `src/app/runtime/useGeometryRuntime.ui.test.tsx`: 371 lines.
- `tools/file-size-baseline.json` lowered the `src/AppMain.tsx` cap to 5,374.

## Follow-Ups

- Plan any future AppMain slimming as a fresh slice. Do not fold it into the completed APPMAIN-SLIM6 through APPMAIN-SLIM8 hook extractions.
