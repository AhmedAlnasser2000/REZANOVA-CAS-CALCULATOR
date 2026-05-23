# TRACK-EQUATION-PARAM3 Manual Verification Checklist

## Metadata

- primary_agent: codex
- primary_agent_model: gpt-5.5
- date: 2026-05-23
- milestone: `EQUATION-PARAM3`
- scope: bounded rational selected-target parameterized Equation solving

## What Is Achieved Now

- Equation mode supports bounded rational equations in one selected target by clearing LCDs and delegating the cleared equation to `EQUATION-PARAM1` or `EQUATION-PARAM2`.
- Original denominator exclusions are preserved in result supplements/details.
- Simple derived nonzero facts from cleared equations are preserved.
- Supported examples include `1/(z-a)=b`, `(z+1)/(z-a)=2`, `(z-a)/(z+b)=c`, `1/(z-a)+1/(z+b)=c`, and `K/(K-k)=2`.

## Boundaries

- No broad rational simplification.
- No cleared equations above degree 2.
- No nested target-denominator rational families.
- No variable memory.
- No named string variables.
- No bivariate elimination, Grobner bases, `POLY-ELIM2`, graphing, Labs runner work, source-mirror execution, or copied source.

## Manual App Steps

- Open Equation > Symbolic and enter `\frac{1}{z-a}=b`; choose `z`; confirm a `z` solution and denominator/nonzero facts.
- Enter `\frac{z+1}{z-a}=2`; choose `z`; confirm `z=2a+1` and `z-a\ne0`.
- Enter `\frac{z-a}{z+b}=c`; choose `z`; confirm the result preserves `z+b\ne0` and a nonzero coefficient fact.
- Enter `\frac{1}{z-a}+\frac{1}{z+b}=c`; choose `z`; confirm a real-guarded quadratic-style solution set and preserved denominator exclusions.
- Enter `\frac{K}{K-k}=2`; choose `K`; confirm `K` and `k` stay distinct.
- Enter `\frac{1}{xz}=a`; confirm raw adjacent-letter products remain unsupported unless multiplication is explicit.

## Verification

- [x] `npm run test:unit -- src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-linear.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
