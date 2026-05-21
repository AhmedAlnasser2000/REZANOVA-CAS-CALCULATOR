# TRACK-APPMAIN-SLIM3 Manual Verification Checklist

## Attribution
- milestone: `APPMAIN-SLIM3`
- primary_agent: `codex`
- primary_agent_model: `gpt-5.5`
- recorded_by_agent: `codex`
- recorded_by_agent_model: `gpt-5.5`
- verified_by_agent: `codex`
- verified_by_agent_model: `gpt-5.5`
- attribution_basis: `live`
- date: `2026-05-21`

## What Is Achieved Now
- `src/AppMain.tsx` is reduced from `6094` lines to `5619` lines.
- Side-surface state, shell scale/outboard layout measurement, and presentation flags live in `useSideSurfaceRuntime`.
- Launcher categories/state, selection derivation, open/back/move/digit/category/app-launch helpers, and catalog loading live in `useLauncherRuntime`.
- Existing shell focus restoration lives in `useShellFocusRuntime`.
- AppMain still owns current mode, settings, history entries, display outcome, mode-specific workbench state, refs, execution handlers, history replay, keyboard listener registration, and render composition.
- No math, solver, parser, UI redesign, result wording, reducers, state machines, broad handler adoption, or Calculate/Advanced runtime hook extraction was added.

## Manual App Steps
- Launch the app and confirm the calculator shell reaches `Ready`.
- Open and close Settings on wide and narrow layouts; confirm outboard/overlay behavior still matches the viewport.
- Open History, replay a guided Calculus entry, and confirm the same guided tool state returns.
- Open the launcher, move with arrows, enter a category, go back, launch an app, and close with Escape.
- Use soft keys and keypad buttons in Calculate, Advanced Calc, Guide, and Equation.
- Switch through Trigonometry, Geometry, and Statistics guided screens and confirm first-field focus still lands correctly.

## Expected Results
- Launcher and side surfaces behave exactly as before the runtime-hook extraction.
- History replay and guide/hotkey flows keep their existing state and result surfaces.
- Focus returns to the same menu/editor/form targets as before.
- No visible result wording, math capability, or UI layout changes appear.

## Verification
- [x] `wc -l src/AppMain.tsx`
- [x] `npm run test:unit -- src/app/logic/primaryActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/runtimeControllers.test.ts src/lib/launcher.test.ts src/lib/calculate-navigation.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/equation-navigation.test.ts src/lib/trigonometry/navigation.test.ts src/lib/geometry/navigation.test.ts src/lib/statistics/navigation.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:memory-protocol`
- [x] `npx playwright test e2e/qa1-smoke.spec.ts --project=chromium`
- [x] `npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium`

## Notes
- The first `calc-audit0` Playwright attempt was started in parallel with `qa1` and failed because the preview port was already in use; the suite passed when rerun alone.
- Build still emits the existing Vite large-chunk warning; this is not addressed in `APPMAIN-SLIM3`.
- No commit was made; commit still requires explicit user approval.
