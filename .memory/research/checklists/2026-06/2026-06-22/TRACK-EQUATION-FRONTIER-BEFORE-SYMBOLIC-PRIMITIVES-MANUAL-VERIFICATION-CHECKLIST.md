# Equation Frontier Baseline Before Symbolic Primitives

Date: 2026-06-22

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live repo inspection

## What Is Achieved Now

- Real Exact factorable/product solving supports explicit and expanded exact-rational factors through 12 target-degree slots when reduced to supported linear/quadratic pieces.
- Real Exact special-form solving supports affine/pure carrier powers and symbolic carrier coefficients through bounded degree 12 cases.
- Symbolic factor discovery covers common carrier powers, safe difference-of-powers, explicit grouping, and grouped affine-carrier quadratics through bounded degree 12.
- Real carrier elimination supports exact-rational linear/quadratic equations in explicit algebraic carriers and back-substitutes through existing branch solvers.
- Complex Exact special forms support exact-rational direct and carrier-quadratic pure/affine cases through 12 visible branches while honoring `complexExactForm`.
- Symbolic Complex special-form roots remain deliberately deferred until a principal-branch root policy exists.

## Manual App Steps

Use Equation > Symbolic, target `x`, Exact mode unless noted.

1. Enter `x^6-5x^3+4=0`.
2. Enter `(x+a)^6-5(x+a)^3+4=0`.
3. Enter `x^6-a*x^3+b=0`.
4. Enter `x^3-a*x^2=0`.
5. Enter `x*(x+a)+b*(x+a)=0`.
6. Enter `(x+c)^2+(a+b)*(x+c)+a*b=0`.
7. Enter `(x+a)^4-5(x+a)^2+4=0`.
8. Turn Complex On, set complex exact form to `cis`, and enter `x^5=32`.
9. Turn Complex On, set complex exact form to rectangular or polar, and enter `x^5=32`.
10. Turn Complex On and enter `x^5=a`.

## Expected Results

- Cases 1-7 produce exact symbolic answers through the current frontier routes.
- Case 8 renders high-degree Complex branches with `cis`.
- Case 9 does not force `cis`; it uses exact trigonometric branch notation until compact rectangular radical coordinates are implemented.
- Case 10 stops honestly with symbolic Complex principal-branch policy guidance and does not show visible `RootOf` or informal `a^{1/5}` branch notation.

## Notes

This checklist is a baseline before Symbolic Primitives work. It is not a new QA requirement for every primitive milestone, but it gives a quick manual sanity pass for the just-finished Equation frontier behavior.
