# Structured Equation Finite Root Set 2 Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Finite exact roots have an internal structured representation with accepted/rejected candidate state.
- Finite-root exact rendering and branch readback now share one normalization/dedupe path.
- Plain numeric quadratics in Symbolic Solve show simplified branch rows in the app.
- Bounded exact-rational polynomial branches retain MathJSON nodes for final display simplification.

## Manual App Steps

1. Open Equation -> Symbolic.
2. Solve `2x+6=0`.
3. Solve `x^2-5x+6=0`.
4. Solve `\frac{x^2-1}{x-1}=0`.
5. Solve `\left|x-1\right|=3`.
6. Solve `\sqrt{x+5}=3`.
7. Solve `x^3-6x^2+11x-6=0`.

## Expected Results

- Answers render as finite exact roots or branch rows without `undefined`.
- Quadratic roots render as `x=2` and `x=3`, not as unsimplified halves.
- Rational filtered root keeps the denominator exclusion visible.
- Answer, detail, supplement, and approximation cards remain readable without obvious overflow.
