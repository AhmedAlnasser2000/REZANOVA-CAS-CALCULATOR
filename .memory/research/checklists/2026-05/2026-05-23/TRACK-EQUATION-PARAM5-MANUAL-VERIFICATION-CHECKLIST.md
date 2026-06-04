# TRACK-EQUATION-PARAM5 Manual Verification Checklist

## Metadata

- primary_agent: codex
- primary_agent_model: gpt-5.5
- date: 2026-05-23
- milestone: `EQUATION-PARAM5`
- scope: bounded exponential/logarithmic selected-target parameterized Equation solving

## What Is Achieved Now

- Equation mode supports one selected-target exponential or logarithmic carrier after a target is selected.
- Supported bases are `e`, common log base `10`, and explicit positive numeric bases not equal to `1`.
- Direct inverse-pair forms such as `e^z=a`, `ln(z+a)=b`, `log(z+a)=b`, and `2^(z+a)=b` solve with domain facts.
- Same-base equalities such as `e^(z+a)=e^b` and `ln(z+a)=ln(b)` reduce to the generated target equation where safe.
- Generated equations delegate to existing `EQUATION-PARAM1`, `EQUATION-PARAM2`, `EQUATION-PARAM3`, or `EQUATION-PARAM4` rather than adding duplicate family logic.
- Domain facts such as positive log arguments, positive exponential outputs, denominator exclusions, and delegated branch facts are preserved.

## Boundaries

- No symbolic bases.
- No invalid numeric bases.
- No log-combine sums, log quotients, or logarithmic product expansion.
- No Lambert W or arbitrary transcendental algebra.
- No nested exp/log towers or mixed target-plus-exp/log equations such as `z+e^z=a`.
- No variable memory, named string variables, bivariate elimination, `POLY-ELIM2`, graphing, Labs runner work, source-mirror execution, or copied source.
- Restriction/readback polish such as inverse-power notation versus fraction notation remains deferred to `EQUATION-PARAM-READBACK1` or `EQUATION-PARAM7`.

## Manual App Steps

- Open Equation > Symbolic and enter `e^z=a`; choose `z` if needed; confirm `z=ln(a)` and `a>0`.
- Enter `e^(z+a)=b`; choose `z`; confirm a `ln(b)-a` style result and `b>0`.
- Enter `ln(z+a)=b`; choose `z`; confirm `z=e^b-a` and a log-domain fact.
- Enter `log(z+a)=b`; choose `z`; confirm `z=10^b-a`.
- Enter `2^(z+a)=b`; choose `z`; confirm a `log_2(b)-a` style result and `b>0`.
- Enter `ln(z^2+a)=b`; choose `z`; confirm quadratic delegation and preserved domain facts.
- Enter `ln(1/(z-a))=b`; choose `z`; confirm rational delegation and denominator/domain facts.
- Enter `e^(|z-a|)=b`; choose `z`; confirm carrier delegation and branch/domain facts.
- Enter `a^z=b`; choose `z`; confirm a controlled symbolic-base boundary.
- Enter `ln(z)+ln(z-a)=b`; choose `z`; confirm a controlled log-combine boundary.

## Verification

- [x] `npm run test:unit -- src/lib/equation/equation-parameterized-exp-log.test.ts src/lib/equation/equation-parameterized-carrier.test.ts src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-parameterized-polynomial.test.ts src/lib/equation/equation-parameterized-linear.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
