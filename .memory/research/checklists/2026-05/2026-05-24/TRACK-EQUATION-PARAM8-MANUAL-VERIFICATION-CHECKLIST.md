# TRACK-EQUATION-PARAM8 Manual Verification Checklist

## Metadata

- milestone: `EQUATION-PARAM8`
- title: Exclusion-Safe Rational Normalization For Selected Targets
- date: 2026-05-24
- primary_agent: codex
- primary_agent_model: gpt-5.5
- scope: implementation

## What Is Achieved Now

- Selected-target rational equations normalize nested rational structures before LCD clearing.
- Original denominator exclusions from rational layers remain visible where the parser preserves them.
- Easy derived nonzero facts from delegated linear/quadratic solving remain visible.
- Cleared equations still delegate only to existing degree-1 and degree-2 selected-target solvers.
- Target-cancel cases return the remaining parameter condition instead of inventing a target value.
- Guide content intentionally remains unchanged in this milestone.

## Manual App Steps

- Launch the app.
- Open Equation mode, Symbolic screen.
- Enter `\frac{1}{1+\frac{1}{z-a}}=b`, select `z`, and run Solve.
- Confirm the result succeeds as a selected-target rational solve and preserves denominator/nonzero facts.
- Enter `\frac{z+a}{b}=c`, select `z`, and run Solve.
- Confirm the result solves for `z` and shows `b\ne0`.
- Enter `\frac{1}{z-a}=\frac{1}{z-b}`, select `z`, and run Solve.
- Confirm the result is the parameter condition `a=b` and details explain that the target cancels.

## Boundaries To Preserve

- No higher-degree cleared solving beyond degree 2.
- No Guide refresh.
- No mixed-carrier or composition solving.
- No symbolic-base exp/log solving.
- No variable memory.
- No named string variables.
- No `POLY-ELIM2`.
- No graphing.
- No new result origins or badges.

## Verification Commands

```bash
npm run test:unit -- src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-parameterized-readback.test.ts src/lib/equation/equation-parameterized-linear.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```
