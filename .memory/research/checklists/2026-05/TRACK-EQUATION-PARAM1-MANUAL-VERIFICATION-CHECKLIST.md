# TRACK-EQUATION-PARAM1 Manual Verification Checklist

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

- `EQUATION-PARAM1` adds affine/linear parameterized Equation solving for one explicitly selected target.
- Non-target symbols are preserved as symbolic parameters, not stored numeric values.
- Supported examples include `x+z=5`, `K+k=8`, `2z+a=7`, `a z+b=c`, and `a z+b=c z+d`.
- Symbolic nonzero coefficient facts such as `a\ne0`, `a-c\ne0`, and `x\ne0` are surfaced as result supplements.
- Raw adjacent-letter products such as `xz=1` remain unsupported; users must enter explicit multiplication such as `x\cdot z=1`.

## Manual App Steps

- Launch the app and open `Equation -> Symbolic`.
- Enter `x+z=5`, choose `z`, solve, and confirm `z=5-x`.
- Enter `K+k=8`, choose `K`, solve, and confirm `K=8-k`.
- Enter `2z+a=7`, choose `z`, solve, and confirm `z=\frac{7-a}{2}`.
- Enter `a\cdot z+b=c`, choose `z`, solve, and confirm `z=\frac{c-b}{a}` plus `a\ne0`.
- Enter `x\cdot z=1`, choose `z`, solve, and confirm `z=\frac{1}{x}` plus `x\ne0`.
- Enter `xz=1` and confirm Calcwiz asks for explicit multiplication instead of guessing.
- Enter `z^2+a=0`, `1/z=a`, and `sin(z)=a`; confirm they stop as future parameterized families.

## Expected Results

- Existing `x` equations and single-variable non-`x` equations still behave as before.
- Multi-symbol affine/linear equations solve only after a target is selected.
- Unsupported parameterized families stop with `EQUATION-PARAM1` boundary guidance.
- No variable memory, named string variables, polynomial parameter solving, rational parameter solving, broad simplification, transcendental algebra, `POLY-ELIM2`, graphing, source-mirror execution, or Labs runner behavior appears.

## Verification Commands

- `npm run test:unit -- src/lib/equation/equation-parameterized-linear.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/engine/math-analysis.test.ts src/lib/algebra/variable-core.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run test:golden`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
