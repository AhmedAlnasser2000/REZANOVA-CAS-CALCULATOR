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

Implemented `ALGEBRAIC-GENUS0-SYMBOLIC-BRANCH-COVERAGE1` as a guarded symbolic widening of the live genus-0 standard radical route.

The new helper covers symbolic affine radicals and centered symbolic-radius plus/circle/outside radicals through the existing public `u-substitution` strategy. It carries explicit facts instead of assuming branches, and it does not add a public algebraic-Risch/genus strategy or change result schemas.

## Scope

- Added a symbolic standard-radical adapter under `src/lib/symbolic-engine/integration/algebraic-genus0/`.
- Made symbolic affine `sqrt(a*x+b)` and `1/sqrt(a*x+b)` live with slope and radicand-domain facts.
- Made centered symbolic-radius families live:
  - `sqrt(a^2-x^2)` and reciprocal circle variants.
  - `sqrt(x^2+a^2)` and reciprocal plus variants.
  - `sqrt(x^2-a^2)` and reciprocal outside variants.
- Reused the existing exact-supplement/readback path for facts such as `a\ne0`, `a^2>0`, and radicand-domain constraints.
- Kept general symbolic completed-square quadratics such as `sqrt(a*x^2+b*x+c)` controlled unsupported until a later branch-completion milestone.

## Runtime Behavior

Live examples now include:

- `sqrt(a*x+b)`
- `1/sqrt(a*x+b)`
- `1/sqrt(a^2-x^2)`
- `sqrt(a^2-x^2)`
- `sqrt(x^2+a^2)`
- `sqrt(x^2-a^2)`

Deferred examples remain:

- `sqrt(a*x^2+b*x+c)`
- `1/sqrt(a*x^2+b*x+c)`
