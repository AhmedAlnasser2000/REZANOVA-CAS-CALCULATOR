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

Implemented `ALGEBRAIC-GENUS0-STANDARD-RADICAL-FAMILIES1` as the first live algebraic genus-0 dispatch milestone.

The new adapter reuses genus-0 inverse readback evidence for standard radical forms and presents them through the existing public `u-substitution` strategy. It does not add a public algebraic-Risch/genus strategy or change result schemas.

## Scope

- Added a standard-radical adapter under `src/lib/symbolic-engine/integration/algebraic-genus0/`.
- Wired the adapter into the `u-substitution` route before the older exact-rational trig-substitution radical fallback.
- Made affine radicals and reciprocal affine radicals live through genus-0 readback.
- Made exact-rational plus/outside quadratic reciprocal radicals live through genus-0 readback.
- Filtered internal pullback parameter denominator facts from visible standard-radical supplements.
- Kept reciprocal circle radical primitives on the existing inverse-trig precedence path.

## Runtime Behavior

Live standard radical examples now include `sqrt(x+1)`, `1/sqrt(x+1)`, `1/sqrt(x^2+1)`, and `1/sqrt(x^2-4)`. Broader rational-in-radical adoption remains deferred to `ALGEBRAIC-GENUS0-RATIONAL-IN-RADICAL1`.
