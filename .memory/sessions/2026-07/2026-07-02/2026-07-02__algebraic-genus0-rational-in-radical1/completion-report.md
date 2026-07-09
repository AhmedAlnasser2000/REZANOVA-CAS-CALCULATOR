## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented `ALGEBRAIC-GENUS0-RATIONAL-IN-RADICAL1` as a bounded live one-radical genus-0 integration slice.

The new route handles exact-rational polynomial numerators up to degree `2` over standard completed-square quadratic radicals and presents results through the existing public `u-substitution` strategy. It does not add a public algebraic-Risch/genus strategy or change result schemas.

## Scope

- Added a rational-in-radical adapter under `src/lib/symbolic-engine/integration/algebraic-genus0/`.
- Reused the existing exact-rational standard quadratic parser from inverse readback.
- Decomposed polynomial numerators in the completed-square radical variable.
- Built exact node-backed primitives directly from standard radical formulas instead of re-entering full pullback integration.
- Wired the adapter into the existing route plan with a fast early check in derivative-ratio routing and a normal `u-substitution` fallback.
- Added focused integration tests for derivative-present quotients and degree-two numerator cases over plus, circle, and outside quadratic radicals.

## Runtime Behavior

Live examples now include:

- `x/sqrt(x^2+1)`
- `x^2/sqrt(x^2+1)`
- `x^2/sqrt(4-x^2)`
- `x^2/sqrt(x^2-4)`
- `(2x^2+3x+4)/sqrt(x^2+1)`

Broader quotients such as `(x+sqrt(x^2+1))/(x-1)` remain controlled unsupported until a wider rational pullback/inverse-readback slice is approved.
