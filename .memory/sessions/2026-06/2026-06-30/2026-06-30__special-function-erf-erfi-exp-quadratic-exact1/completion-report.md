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

`SPECIAL-FUNCTION-ERF-ERFI-EXP-QUADRATIC-EXACT1` makes exact-rational quadratic exponential integrals show named `erf`/`erfi` formulas as the main Answer.

## Changes

- Added an exact-rational completed-square special-function builder for `e^(a*x^2+b*x+c)`.
- Routed exact-rational quadratic certificate proofs through `erf`/`erfi` readback before falling back to the non-elementary-only certificate message.
- Kept certificate proof detail sections visible so the main special-function answer still explains why no elementary antiderivative exists.
- Left symbolic leading-coefficient casewise `erf`/`erfi` readback deferred to the next milestone.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-06/2026-06-30.md`
- `.memory/sessions/2026-06/2026-06-30/2026-06-30__special-function-erf-erfi-exp-quadratic-exact1/`
