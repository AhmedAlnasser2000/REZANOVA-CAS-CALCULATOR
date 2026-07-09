# CALCULUS-MIXED-PARTIALS1 Completion Report

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

Completed `CALCULUS-MIXED-PARTIALS1` as the second derivative capability milestone after higher-order ordinary derivatives.

## Changes

- Guided `Partial Derivative` now evaluates compact higher/mixed partial operators from the existing derivative operator rail.
- Evaluation uses the parsed `appliedPath`, preserving the standard compact convention where the rightmost written factor acts first.
- Written operator order and applied-order readback remain unchanged in the UI.
- Mixed partials are capped by the existing derivative operator order cap of `10`.
- Stored-value substitution protects every variable in the mixed partial applied path.

## Boundaries

- No Clairaut/symmetry reordering, derivative steps card, implicit differentiation, Equation seam, Jacobian, Hessian, vector calculus, Limits, ODE, OOE capability, Tauri, or public Display schema changes.
- Broad `tsc` and file-size gates remain blocked by unrelated active work; see verification summary.
