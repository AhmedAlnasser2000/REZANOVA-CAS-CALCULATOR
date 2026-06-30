# CALCULUS-DERIVATIVE-STEPS-CARD1 Completion Report

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

Completed `CALCULUS-DERIVATIVE-STEPS-CARD1` as the third derivative capability milestone after higher-order ordinary derivatives and mixed partials.

## Changes

- Added derivative-stage collection to the shared Calculus derivative evaluation helper.
- Guided derivative, derivative-at-point, and partial-derivative successes now expose a `Derivative Steps` detail section.
- The steps card records the canonical operator, applied order, and each derivative stage as `D_n` math lines.
- Derivative-at-point adds a separate final substitution line after symbolic differentiation.
- First-order Calculate-backed derivative paths keep their existing result/fallback behavior and attach steps only when the symbolic steps helper can generate them.

## Boundaries

- The structured Display `Answer` block remains the only final-result owner.
- No Display schema, Display component, OOE, History, Tauri, persistence, Equation seam, implicit differentiation, Jacobian, Hessian, vector calculus, Limits, or ODE changes.
- Broad `tsc` remains blocked by unrelated active Equation numeric interval work; see verification summary.
