# Equation Numeric Angle-Unit Consistency Completion Report

- Gate: `backend`
- Status: verified, not committed

## Delivered
- Fixed Equation numeric interval solving so direct trig equations respect the selected `RAD` / `DEG` / `GRAD` mode end to end.
- Routed the shared Equation residual and candidate-validation path through the same angle-unit-aware trig rewriting used by numeric interval solving.
- Changed explicit `Run Numeric Solve` to execute the numeric interval stage before later symbolic-family stops, so valid interval solving is still available for recognized-but-unresolved composition families.
- Added unit-aware interval guidance for direct trig numeric misses, including sampled inner-image text and current-unit branch-family hints when the solver can infer them.
- Extended the shared signed-number input/parser path to accept scientific notation, so large suggested intervals like `3e19` can be entered naturally in the Equation numeric solve panel.

## Main Files
- `src/lib/equation/domain-guards.ts`
- `src/lib/equation/candidate-validation.ts`
- `src/lib/equation/numeric-interval-solve.ts`
- `src/lib/equation/guarded/numeric-stage.ts`
- `src/lib/equation/guarded/run.ts`
- `src/AppMain.ui.test.tsx`
- `e2e/qa1-smoke.spec.ts`

## Notes
- This patch is Equation-specific; `Calculate` angle-mode fixes were already shipped earlier.
- The practical follow-up case `tan(ln(x+1))=1` now works numerically when the user supplies a branch-local interval such as `[1, 2]` in `RAD`.
- In `DEG` / `GRAD`, the same equation usually needs a much larger interval because `tan(y)=1` occurs near `45 deg + 180 deg * k` or `50 grad + 200 grad * k`, and the UI now surfaces that guidance directly on numeric misses.
- The interval inputs now accept either expanded literals or scientific notation for those huge branch windows.
