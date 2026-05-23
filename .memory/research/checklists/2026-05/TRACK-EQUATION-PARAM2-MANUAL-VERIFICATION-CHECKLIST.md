# TRACK-EQUATION-PARAM2 Manual Verification Checklist

## Metadata

- primary_agent: codex
- primary_agent_model: gpt-5.5
- date: 2026-05-23
- milestone: `EQUATION-PARAM2`
- scope: real-guarded quadratic selected-target parameterized Equation solving

## What Is Achieved Now

- Equation mode supports bounded quadratic equations in one selected target while preserving other symbols as symbolic parameters.
- Supported families include `z^2-a=0`, `z^2+x z+1=0`, `a z^2+b z+c=0`, and case-sensitive targets such as `K^2-k=0`.
- Results expose real-domain discriminant facts and symbolic leading-coefficient nonzero facts.
- `EQUATION-PARAM1` affine/linear behavior remains the first attempted parameterized family.

## Boundaries

- No variable memory.
- No named string variables.
- No rational target-denominator solving.
- No higher-degree polynomial factorization.
- No absolute/radical/power, exponential/logarithmic, or trigonometric parameterized families.
- No bivariate elimination, Grobner bases, `POLY-ELIM2`, graphing, Labs runner work, source-mirror execution, or copied source.

## Manual App Steps

- Open Equation > Symbolic and enter `z^2-a=0`; choose `z`; confirm a `z` solution set with `a>=0` style real-domain fact.
- Enter `z^2+x z+1=0`; choose `z`; confirm the result mentions `x^2-4` and preserves `x` as a symbolic parameter.
- Enter `a z^2+b z+c=0`; choose `z`; confirm `a\ne0` and discriminant facts appear.
- Enter `K^2-k=0`; choose `K`; confirm `K` and `k` stay distinct.
- Enter `xz^2+1=0`; confirm raw adjacent-letter products remain unsupported unless multiplication is explicit.

## Verification

- [x] `npm run test:unit -- src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-linear.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
