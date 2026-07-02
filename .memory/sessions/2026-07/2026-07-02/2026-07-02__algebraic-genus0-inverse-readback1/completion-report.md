## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

Implemented `ALGEBRAIC-GENUS0-INVERSE-READBACK1` as a behavior-invisible backend milestone.

The new inverse-readback helper sits after genus-0 pullback evidence and constructs original-variable antiderivative nodes for the first clean textbook families. It does not run from integration dispatch yet.

## Scope

- Added node-backed inverse readback for affine radicals and reciprocal affine radicals.
- Added exact-rational completed-square quadratic readback for plus, circle, and outside-root forms, using `arsinh`, `arcsin`, or `arcosh` where cleaner.
- Added derivative-present radical quotient readback such as `x/sqrt(x^2+1) -> sqrt(x^2+1)`.
- Reused the existing inverse-hyperbolic differentiation support; no broad differentiation rewrite was needed.
- Taught algebraic genus-0 profiling to stop on inverse-hyperbolic carriers so readback heads do not become accepted integrand carriers.

## Runtime Behavior

No live integration dispatch changed. Standard radical family adoption remains deferred to `ALGEBRAIC-GENUS0-STANDARD-RADICAL-FAMILIES1`.
