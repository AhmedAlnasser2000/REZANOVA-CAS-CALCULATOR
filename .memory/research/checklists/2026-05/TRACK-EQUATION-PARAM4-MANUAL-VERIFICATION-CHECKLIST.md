# TRACK-EQUATION-PARAM4 Manual Verification Checklist

## Metadata

- primary_agent: codex
- primary_agent_model: gpt-5.5
- date: 2026-05-23
- milestone: `EQUATION-PARAM4`
- scope: bounded nonperiodic carrier selected-target parameterized Equation solving

## What Is Achieved Now

- Equation mode supports one selected-target nonperiodic carrier after a target is selected.
- Supported carriers are absolute value, square root, and square power.
- Simple affine shells around one carrier are isolated before branch solving.
- Generated branch equations delegate to `EQUATION-PARAM1`, `EQUATION-PARAM2`, or `EQUATION-PARAM3` where safe.
- Branch/domain facts such as `b\ge0` and `b-c\ge0` are preserved.
- Delegated rational carrier branches preserve denominator exclusions and nonzero facts.

## Boundaries

- No periodic trig composition.
- No deep or broad `COMP` composition reopening.
- No nested carrier towers.
- No general piecewise algebra.
- No inequality solver.
- No variable memory.
- No named string variables.
- No bivariate elimination, Grobner bases, `POLY-ELIM2`, graphing, Labs runner work, source-mirror execution, or copied source.
- Restriction-formatting polish such as `(...)^{-1}` versus `1/(...)` is deferred to `EQUATION-PARAM-READBACK1` or `EQUATION-PARAM7`.

## Manual App Steps

- Open Equation > Symbolic and enter `|z-a|=b`; choose `z`; confirm a two-branch `z` set and `b\ge0`.
- Enter `2|z-a|+c=d`; choose `z`; confirm carrier isolation and preserved symbolic parameters.
- Enter `sqrt(z+a)=b`; choose `z`; confirm `z=b^2-a` and `b\ge0`.
- Enter `sqrt(z-a)+c=b`; choose `z`; confirm `z=(b-c)^2+a` and `b-c\ge0`.
- Enter `(z-a)^2=b`; choose `z`; confirm two square-root branches and `b\ge0`.
- Enter `|1/(z-a)|=b`; choose `z`; confirm rational branch solving and denominator/nonzero facts.
- Enter `sin(|z-a|)=b`; choose `z`; confirm controlled boundary wording rather than a misleading solve.

## Verification

- [x] `npm run test:unit -- src/lib/equation/equation-parameterized-carrier.test.ts src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-linear.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
