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

`SPECIAL-FUNCTION-ERF-ERFI-EXP-QUADRATIC-SYMBOLIC-CASEWISE1` extends the special-function answer layer to symbolic quadratic leading coefficients.

## Changes

- Added casewise `erf`/`erfi` readback for `e^(a*v^2+b*v+c)` when `a` is target-free symbolic with respect to the selected variable.
- Kept `a\ne0` as the global `Valid When` fact while placing `a<0` and `a>0` inside the casewise answer rows.
- Preserved exact-rational compact formulas, elementary affine exponential ownership, substitution overlaps, certificate proof detail sections, and public Calculus schemas.
- Added arbitrary selected-variable coverage for `t` while treating `x` as a parameter.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-06/2026-06-30.md`
- `.memory/sessions/2026-06/2026-06-30/2026-06-30__special-function-erf-erfi-exp-quadratic-symbolic-casewise1/`
