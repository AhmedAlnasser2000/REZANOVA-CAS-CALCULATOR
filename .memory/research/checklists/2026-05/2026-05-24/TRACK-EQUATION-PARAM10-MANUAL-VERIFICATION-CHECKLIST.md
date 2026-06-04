# TRACK-EQUATION-PARAM10 Manual Verification Checklist

## Metadata

- milestone: `EQUATION-PARAM10`
- title: Symbolic-Base Exp/Log Selected-Target Solving
- date: 2026-05-24
- primary_agent: codex
- primary_agent_model: gpt-5.5
- scope: implementation

## What Is Achieved Now

- Selected-target Equation solving supports target-free symbolic exponential/logarithmic bases such as `a^z=b`.
- Symbolic-base inverse-pair isolation emits base facts such as `a>0`, `a\ne1`, and output/log-argument positivity facts.
- Direct target-in-base cases such as `z^a=b` and `\log_z(a)=b` solve on the principal positive real branch only.
- Generated equations continue through existing selected-target helper files rather than milestone-name abstractions.

## Manual App Steps

- Launch the app.
- Open Equation mode, Symbolic screen.
- Enter `a^z=b`, select `z`, and run Solve.
- Confirm the result shows `z=\log_a(b)` with facts `a>0`, `a\ne1`, and `b>0`.
- Enter `\log_a(z+c)=d`, select `z`, and run Solve.
- Confirm the result shows `z=a^d-c` and preserves `z+c>0`.
- Enter `z^a=b`, select `z`, and run Solve.
- Confirm the result shows the principal positive root branch and facts `b>0`, `a\ne0`, and `z>0`.
- Enter `z^z=a`, select `z`, and run Solve.
- Confirm the app stops instead of attempting a broad mixed base/exponent solve.

## Boundaries To Preserve

- No Lambert W.
- No log-combine search.
- No arbitrary mixed exponential-polynomial solving.
- No target in both base and exponent/argument.
- No extra integer/rational exponent branches beyond the principal positive branch.
- No Guide update.
- No composition widening, variable memory, named string variables, `POLY-ELIM2`, graphing, source-mirror execution, or Labs runner work.

## Verification Commands

```bash
npm run test:unit -- src/lib/equation/equation-parameterized-exp-log.test.ts src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-factorable-polynomial.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```
