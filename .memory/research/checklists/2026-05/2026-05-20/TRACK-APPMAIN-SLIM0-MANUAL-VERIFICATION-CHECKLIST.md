# TRACK-APPMAIN-SLIM0 Manual Verification Checklist

milestone: `APPMAIN-SLIM0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Re-adopt existing `src/app/workspaces/*Workspace.tsx` components as rendering boundaries.
- Keep `src/AppMain.tsx` as the orchestration root for global state, refs, routing, history, keyboard handling, execution handlers, and shell ownership.
- Preserve product behavior while reducing `src/AppMain.tsx` from the previous 10k+ line shape.
- Keep `INT-RAT1` postponed behind this repo-organization pass.
- Do not add math behavior, solver behavior, UI redesign, new state machines, reducers, or app-wide architecture rewrites.

## Manual Checks

- [x] `src/AppMain.tsx` line count reduced from `10956` to `8140`.
- [x] Calculate workspace rendering uses `CalculateWorkspace`.
- [x] Advanced Calc workspace rendering uses `AdvancedCalculusWorkspace`.
- [x] Guide workspace rendering uses `GuideWorkspace`.
- [x] Equation workspace rendering uses `EquationWorkspace`.
- [x] Trigonometry workspace rendering uses `TrigonometryWorkspace`.
- [x] Geometry workspace rendering uses `GeometryWorkspace`.
- [x] Matrix, Vector, and Table workspace rendering use their existing workspace components.
- [x] Statistics remains inline because the existing workspace component still needs parity work before adoption.
- [x] Workspace parity fixes preserve current behavior and test selectors.
- [x] No commit was made without explicit user approval.

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
