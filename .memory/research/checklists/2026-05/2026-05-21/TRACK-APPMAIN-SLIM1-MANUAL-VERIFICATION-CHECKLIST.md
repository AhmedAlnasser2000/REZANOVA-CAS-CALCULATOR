# TRACK-APPMAIN-SLIM1 Manual Verification Checklist

## Session
- milestone: `APPMAIN-SLIM1`
- completed_at: `2026-05-21 00:20:01 +0300`
- primary_agent: `codex`
- primary_agent_model: `gpt-5.5`

## Scope
- [x] Wire `StatisticsWorkspace` into `AppMain` with parity for mean inference, source-sync summary, filled frequency row count, guide links, copy/use actions, and current labels/classes.
- [x] Extract render-only shell components under `src/app/shell/`.
- [x] Keep AppMain ownership of global state, refs, routing, history replay, execution handlers, keyboard handling, and shell orchestration.
- [x] Avoid math behavior, solver behavior, parser behavior, UI redesign, reducers, state machines, and runtime hook extraction.
- [x] Keep `INT-RAT1` postponed behind repo organization.

## Extracted Render Boundaries
- [x] `DisplayPanel`
- [x] `ModeStrip`
- [x] `SoftMenu`
- [x] `KeypadPanel`
- [x] `LauncherWorkspace`
- [x] `SideSurfaceHost`
- [x] `StatisticsWorkspace`

## Line Count
- [x] Before APPMAIN-SLIM1: `8140` lines in `src/AppMain.tsx`.
- [x] After APPMAIN-SLIM1: `6973` lines in `src/AppMain.tsx`.
- [x] Acceptance target met: below `7000` lines.

## Verification
- [x] `wc -l src/AppMain.tsx`
- [x] `npm run test:unit -- src/app/logic/primaryActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/runtimeControllers.test.ts src/lib/navigation/launcher.test.ts src/lib/modes/calculate-navigation.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/equation/equation-navigation.test.ts src/lib/trigonometry/navigation.test.ts src/lib/geometry/navigation.test.ts src/lib/statistics/navigation.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:memory-protocol`
- [x] `npx playwright test e2e/qa1-smoke.spec.ts --project=chromium`
- [x] `npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium`

## Notes
- Build still emits the existing Vite large-chunk warning; this is not new product behavior and is not addressed in `APPMAIN-SLIM1`.
- Several shell components intentionally accept broad view props in this milestone; narrowing props can happen in `APPMAIN-SLIM2` without changing behavior.
- No commit was made during closeout; commit still requires explicit user approval.
