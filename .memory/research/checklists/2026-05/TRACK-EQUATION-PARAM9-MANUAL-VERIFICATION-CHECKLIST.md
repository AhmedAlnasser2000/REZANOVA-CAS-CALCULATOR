# TRACK-EQUATION-PARAM9 Manual Verification Checklist

## Metadata

- milestone: `EQUATION-PARAM9`
- title: Factorable Polynomial Selected-Target Solving
- date: 2026-05-24
- primary_agent: codex
- primary_agent_model: gpt-5.5
- scope: implementation

## What Is Achieved Now

- Selected-target Equation solving supports explicit symbolic zero-products up to degree 4.
- Linear and quadratic target-containing factors delegate to existing PARAM1/PARAM2 solvers.
- Repeated factor roots are deduped while multiplicity remains visible in details.
- Existing exact-rational bounded cubic/quartic factor solving is available through the PARAM9 helper.
- Unsupported symbolic expanded cubics/quartics stop instead of using broad formulas.

## Manual App Steps

- Launch the app.
- Open Equation mode, Symbolic screen.
- Enter `(z-a)(z-b)(z-c)=0`, select `z`, and run Solve.
- Confirm the result shows `z\in{a,b,c}` and `Parameterized Factorable Polynomial Solve`.
- Enter `(z-a)(z^2+x z+1)=0`, select `z`, and run Solve.
- Confirm the result includes the linear branch and quadratic branches, with the discriminant fact.
- Enter `a\cdot(z-b)=0`, select `z`, and run Solve.
- Confirm the app stops instead of returning a conditional any-target family.

## Boundaries To Preserve

- No general symbolic cubic or quartic formula.
- No degree greater than 4.
- No partial solution sets when a target-containing factor is unsupported.
- No Guide update.
- No rational widening beyond PARAM8.
- No composition, symbolic-base exp/log, variable memory, named string variables, `POLY-ELIM2`, graphing, source-mirror execution, or Labs runner work.

## Verification Commands

```bash
npm run test:unit -- src/lib/equation/equation-parameterized-factorable-polynomial.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/algebra/polynomial-factor-solve.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx
npm run test:golden
npm run test:memory-protocol
npm run lint
npm run build
```
