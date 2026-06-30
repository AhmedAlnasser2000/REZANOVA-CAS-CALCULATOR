# CALCULUS-HIGHER-ORDER-DERIVATIVES1 Completion Report

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

Completed `CALCULUS-HIGHER-ORDER-DERIVATIVES1` as the first gated capability milestone after the derivative operator rail.

## Changes

- Added a Calculus workspace repeated-derivative evaluator that applies the existing symbolic differentiator along the parsed ordinary derivative operator path.
- Guided `Derivative` now evaluates ordinary higher-order rail operators such as `d^3/dt^3` up to the existing order cap of `10`.
- Guided `Derivative at Point` now differentiates symbolically first, then substitutes the numeric point for higher-order ordinary operators.
- Higher-order derivative-at-point does not use numeric fallback in this milestone.
- The existing first-order guided derivative and first-order derivative-at-point paths still route through the existing Calculate-backed flow.
- Stored-value substitution protects the selected derivative variable for the new higher-order Calculus workspace path.

## Boundaries

- Mixed partial evaluation remains gated for `CALCULUS-MIXED-PARTIALS1`.
- No derivative steps card, implicit differentiation, Equation seam, Jacobian, Hessian, vector calculus, Limits, ODE, OOE capability, Tauri, or public Display schema changes.
- Broad `tsc` and file-size gates remain blocked by unrelated active work; see verification summary.
