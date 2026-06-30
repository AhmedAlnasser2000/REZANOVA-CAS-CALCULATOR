# EQUATION-IMPLICIT-DERIVATIVE-SOLVE-SEAM1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Equation owns a public seam that can solve differentiated implicit relations for a single internal derivative placeholder and map it to display derivative output.
- The later Calculus implicit screen can call this seam without importing private Equation isolation or adding a separate local solver.

## Manual App Steps

- No visible app surface changes in this gate.
- Later, after the Calculus implicit screen lands, use examples such as `x^2+y^2=25` and `xy+\sin(y)=x` to verify the full UI path.

## Expected Results

- No visible behavior changes yet.
- Future Calculus implicit differentiation should be able to show `dy/dx=\frac{-x}{y}` for `x^2+y^2=25` and `dy/dx=\frac{1-y}{x+\cos(y)}` for `xy+\sin(y)=x` through this seam.
