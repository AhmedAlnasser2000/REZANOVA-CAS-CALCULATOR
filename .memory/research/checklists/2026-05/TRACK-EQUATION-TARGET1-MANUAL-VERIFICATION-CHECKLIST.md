# TRACK-EQUATION-TARGET1 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: direct

## What Is Achieved Now

- `EQUATION-TARGET1` makes Equation mode consume `VARIABLE-CORE1` visibly.
- Single-variable `x` equations keep the existing solver path.
- Single-variable non-`x` equations such as `z+1=3` and `K^2=4` solve through safe retargeting.
- Multi-symbol equations show a `Solve for` selector but stop honestly because parameterized solving is still future work.
- Reserved constants/functions and deferred named-string variables are not accepted as solve targets.

## Manual App Steps

- Launch the app and open `Equation -> Symbolic`.
- Solve `x+1=3` and confirm the existing `x=2` behavior remains.
- Solve `z+1=3` and confirm the result is rewritten to `z=2`.
- Solve `K^2=4` and confirm the result uses `K`, not `x`.
- Enter `x+z=5`, choose `z` in the `Solve for` selector, and confirm the app stops with parameterized-target guidance.
- Enter `hello=5` and confirm Calcwiz does not treat `hello` as one named variable.

## Expected Results

- Single-target equations solve normally.
- The target selector appears only for multi-symbol Equation input.
- Multi-symbol equations do not silently choose `x`.
- No variable memory, named string variables, multivariable solving, `POLY-ELIM2`, graphing, source-mirror execution, or Labs runner behavior appears.

## Verification Commands

- `npm run test:unit -- src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts src/lib/algebra/capability-readiness.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run test:golden`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
