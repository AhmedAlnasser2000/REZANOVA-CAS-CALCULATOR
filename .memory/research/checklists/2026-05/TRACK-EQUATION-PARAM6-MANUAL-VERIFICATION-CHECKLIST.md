# TRACK-EQUATION-PARAM6 Manual Verification Checklist

## Metadata

- milestone: `EQUATION-PARAM6`
- title: Direct Affine Trig Parameterized Target Solving
- date: 2026-05-23
- primary_agent: codex
- primary_agent_model: gpt-5.5
- scope: implementation

## What Is Achieved Now

- Equation mode can solve one selected-target `sin`, `cos`, or `tan` carrier with an affine selected-target argument.
- Supported examples include:
  - `sin(z)=a`
  - `cos(z+a)=b`
  - `tan(2z+a)=b`
  - `2sin(z+a)+c=d`
  - `sin(A z+B)=c`
- Periodic families use integer parameter `n`.
- Angle unit is honored through explicit inverse-trig conversion factors:
  - RAD: `arcsin(a)+2πn`
  - DEG: `(180/π)arcsin(a)+360n`
  - GRAD: `(200/π)arcsin(a)+400n`
- Range facts, symbolic nonzero coefficient facts, and `n in Z` facts are surfaced through existing result surfaces.

## Manual App Steps

- Launch the app.
- Open Equation mode, Symbolic screen.
- Enter `sin(z)=a`, select `z`, and run Solve.
- Confirm the result is a periodic family for `z` and includes `arcsin(a)` and `2πn` in RAD mode.
- Switch to DEG and repeat; confirm the readback uses `(180/pi)arcsin(a)` and period `360n`.
- Enter `cos(z+a)=b`, select `z`, and confirm two shifted cosine branches.
- Enter `tan(2z+a)=b`, select `z`, and confirm one tangent periodic family divided by `2`.
- Enter `sin(A z+B)=c`, select `z`, and confirm `A != 0`, `-1 <= c <= 1`, and `n in Z` facts appear.
- Enter `sin(z)+cos(z)=a` and confirm it stops as outside the supported PARAM6 boundary.

## Boundaries To Preserve

- No trig identity solving.
- No multiple-carrier trig solving.
- No nonlinear target argument solving such as `sin(z^2)=a`.
- No nested trig or deep `COMP` reopening.
- No variable memory.
- No named string variables.
- No `POLY-ELIM2`.
- No graphing.
- No source-mirror execution or copied source.

## Verification Commands

```bash
npm run test:unit -- src/lib/equation/equation-parameterized-trig.test.ts src/lib/equation/equation-parameterized-exp-log.test.ts src/lib/equation/equation-parameterized-carrier.test.ts src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-linear.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```
