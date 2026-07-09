# CALCULUS-DERIVATIVES-UX-TAXONOMY1 Completion Report

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

Completed `CALCULUS-DERIVATIVES-UX-TAXONOMY1` as the first gated milestone in the derivative roadmap.

## Changes

- Partial Derivative now appears under `Calculus > Derivatives`; the visible top-level `Partials` card is removed while legacy route/schema compatibility remains.
- Derivative, Derivative at Point, and Partial Derivative keep the main editor body-only and use the lower editor strip as the first-order operator rail.
- The rail owns the readable operator badge, function hint, "With respect to" variable control, and derivative-at-point value input.
- The lower Calculus workspace no longer repeats derivative context controls; it keeps generated request preview/copy only.
- Visible derivative wording now avoids "target" in favor of "with respect to"; Limits retain their target wording.

## Boundaries

- No higher-order derivative, mixed partial, implicit differentiation, Limit, ODE, Jacobian, Hessian, vector calculus, Display schema, OOE, Tauri, or public result schema changes.
- The rail remains first-order and non-MathLive in this milestone; editable compact operator parsing is deferred to `CALCULUS-DERIVATIVE-OPERATOR-RAIL1`.
