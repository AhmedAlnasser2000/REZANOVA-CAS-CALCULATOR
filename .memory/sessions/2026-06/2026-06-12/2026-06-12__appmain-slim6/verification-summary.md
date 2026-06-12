# APPMAIN-SLIM6 Verification Summary

Date: 2026-06-12
Agent: codex
Model: gpt-5

## Result

`APPMAIN-SLIM6` extracted the Trigonometry-owned AppMain runtime/UI cluster into `src/app/runtime/useTrigonometryRuntime.ts`.

## What Changed

- New hook owns Trig screen/menu/form state, draft state, Trig refs, route/menu derived values, Guide seed/example loading, History replay restoration, reset helpers, and `runTrigAction`.
- AppMain keeps cross-mode orchestration: launcher/Guide/history mode switching, display commits, shell panels, app memory, and shared keyboard/soft-menu routing.
- Trigonometry workspace props, class names, schemas, history/replay payloads, capability ID `trigonometry.evaluate`, and worker/fallback host IDs were preserved.
- Added focused UI hook tests for draft updates, Guide seed/example helpers, empty-input errors, successful launch-ticket commit, stale commit drop, cancellation, and reset behavior.

## Boundaries

- No solver/core changes.
- No `src/lib/app-state/schemas.ts` changes.
- No Trigonometry capability, OOE plan, worker host, history schema, display contract, or route ID changes.
- No Equation composition, Algebra district, global reducer, event bus, or broad app-flow extraction.

## Verification

- `npx tsc --noEmit` passed.
- `npm run test:unit -- src/lib/trigonometry/navigation.test.ts src/lib/trigonometry/parser.test.ts src/lib/trigonometry/core.test.ts src/lib/modes/trigonometry-worker-runtime.test.ts src/app/logic/primaryActionRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/expressionRouting.test.ts` passed.
- `npm run test:ui -- src/app/runtime/useTrigonometryRuntime.ui.test.tsx` passed.
- `npm run test:ui -- src/app/runtime/useTrigonometryRuntime.ui.test.tsx src/AppMain.ui.test.tsx` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `node tools/validate-file-sizes.mjs --update-baseline` lowered one cap, then `npm run test:file-sizes` passed.

## Size Ratchet

- `src/AppMain.tsx`: 7,644 -> 6,957 lines.
- `src/app/runtime/useTrigonometryRuntime.ts`: 879 lines, below the default 900-line cap.
- `tools/file-size-baseline.json` ratcheted `src/AppMain.tsx` down to the new line count.
