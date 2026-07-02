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

Implemented `ALGEBRAIC-GENUS0-PULLBACK-RATIONAL-INTEGRATION1` as a behavior-invisible backend milestone.

The new helper converts supported one-radical genus-0 integrands into rational pullbacks in the parametrization variable, then delegates that rational integrand to the existing symbolic integration dispatcher for direct-test evidence.

## Scope

- Added pullback evidence for admitted symbolic affine and exact-rational completed-square quadratic radical profiles.
- Replaced all occurrences of the single radical extension with the parametrized radical, including reciprocal radical spelling.
- Replaced the selected variable with `v=phi(t)` and multiplied by `dv/dt`.
- Delegated the resulting parameter-rational integrand to existing symbolic integration routes.
- Preserved explicit stops for profile, parametrization, substitution, node-limit, and rational-integration failures.

## Runtime Behavior

No live integration dispatch changed. Inverse readback and public adoption remain deferred to later genus-0 milestones.
