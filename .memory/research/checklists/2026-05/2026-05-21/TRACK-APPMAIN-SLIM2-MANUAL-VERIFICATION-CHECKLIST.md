# TRACK-APPMAIN-SLIM2 Manual Verification Checklist

## Session
- milestone: `APPMAIN-SLIM2`
- completed_at: `2026-05-21 00:38:35 +0300`
- primary_agent: `codex`
- primary_agent_model: `gpt-5.5`
- recorded_by_agent: `codex`
- recorded_by_agent_model: `gpt-5.5`
- verified_by_agent: `codex`
- verified_by_agent_model: `gpt-5.5`
- attribution_basis: `live`

## What Is Achieved Now
- [x] `src/AppMain.tsx` reduced from the `APPMAIN-SLIM1` baseline of `6973` lines to `6094` lines.
- [x] Existing typed soft-action and keypad routers are wired into AppMain.
- [x] Window keyboard dispatch moved into `src/app/logic/windowKeyRouter.ts`.
- [x] AppMain still owns state, refs, effects, history replay, execution handlers, keyboard listener registration, and shell orchestration.
- [x] Broad `@ts-nocheck` flow/mode handler files remain out of the stable SLIM2 boundary.
- [x] No math, solver, parser, UI redesign, reducer, grouped hook, or runtime behavior change was intentionally added.

## Manual App Steps
- [ ] Open the launcher and navigate with digits, arrows, `Enter`, `F5`, and `F6`.
- [ ] Use soft keys in Calculate, Equation, Advanced Calc, Geometry, Trigonometry, Statistics, Table, Matrix, and Vector.
- [ ] Use keypad buttons for digits, cursor movement, delete, clear, history, angle unit cycle, and evaluate.
- [ ] Toggle Settings and History on wide and narrow layouts.
- [ ] Replay a guided Calculus history entry and an Advanced Calc history entry.
- [ ] Confirm Statistics and Table workflows still behave as stabilized in `APPMAIN-SLIM1`.

## Expected Results
- Launcher selection, back, open, and exit behavior matches the pre-SLIM2 app.
- Soft keys and keypad buttons trigger the same actions and result surfaces as before.
- Settings/history side surfaces open and close normally.
- Guided Calculus and Advanced Calc replay return to the same tool state.
- No visible math/result wording changes appear from this refactor.

## Verification
- [x] `wc -l src/AppMain.tsx`
- [x] `npm run test:unit -- src/app/logic/primaryActionRouter.test.ts src/app/logic/keypadRouter.test.ts src/app/logic/softActionRouter.test.ts src/app/logic/runtimeControllers.test.ts src/lib/navigation/launcher.test.ts src/lib/modes/calculate-navigation.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/equation/equation-navigation.test.ts src/lib/trigonometry/navigation.test.ts src/lib/geometry/navigation.test.ts src/lib/statistics/navigation.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:memory-protocol`
- [x] `npx playwright test e2e/qa1-smoke.spec.ts --project=chromium`
- [x] `npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium`

## Notes
- Build still emits the existing Vite large-chunk warning; this is not addressed in `APPMAIN-SLIM2`.
- The first full `calc-audit0` smoke run had one transient LIM3 expectation failure; the focused LIM3 rerun and the full suite rerun both passed without code changes.
- `APPMAIN-SLIM3` remains the future grouped runtime hooks milestone.
- No commit was made; commit still requires explicit user approval.
