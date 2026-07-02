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

Implemented `ALGEBRAIC-GENUS0-PARAMETRIZATION1` as a behavior-invisible backend milestone.

The new parametrization helper records rational substitution evidence for admitted genus-0 radicals without changing integration dispatch.

## Scope

- Added symbolic affine radical parametrization:
  - `v=(t^2-b)/a`,
  - `sqrt(a*v+b)=t`,
  - `dv/dt=2t/a`.
- Added exact-rational completed-square quadratic parametrization for standard plus, circle, and outside-root families when no hidden algebraic constants are required.
- Recorded parameter-denominator facts through the existing exact-supplement path.
- Stopped symbolic quadratic parametrization and nonsquare exact scales cleanly for later branch/algebraic-constant work.

## Runtime Behavior

No live integration behavior changed. This milestone is direct-test and substrate only.
