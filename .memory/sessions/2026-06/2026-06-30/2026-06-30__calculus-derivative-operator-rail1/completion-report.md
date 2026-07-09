# CALCULUS-DERIVATIVE-OPERATOR-RAIL1 Completion Report

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

Completed `CALCULUS-DERIVATIVE-OPERATOR-RAIL1` as the second gated milestone in the derivative roadmap.

## Changes

- Added a canonical derivative operator model under `src/lib/calculus/derivative-operator.ts` for ordinary and partial operators.
- The model parses compact ordinary, higher-order ordinary, first-order partial, and mixed partial forms with an order cap of `10`.
- The rail now uses one editable operator input instead of variable shortcut chips, while the main editor remains function-body-only.
- Rail readback shows written operator plus applied order using the standard rightmost-first convention.
- Generated preview, Copy Expr, runtime launch evidence, history seeds, replay, and workspace snapshots can carry optional `operatorLatex` while legacy `bodyLatex + variable` seeds remain valid.
- First-order ordinary derivative, derivative-at-point, and partial derivative evaluation remain compatible.
- Higher-order ordinary derivative, higher-order derivative-at-point, and mixed/higher partial evaluation return controlled unsupported messages until their later capability milestones.
- The pale Calculus display rail now has readable operator label/readback/input contrast.

## Boundaries

- No higher-order derivative evaluation, mixed partial evaluation, implicit differentiation, Jacobian, Hessian, vector calculus, Limits, ODE, Display result schema, OOE capability, Tauri, or public result schema changes.
- Full `tsc` and full file-size verification are blocked by unrelated active work outside this milestone; see verification summary.
