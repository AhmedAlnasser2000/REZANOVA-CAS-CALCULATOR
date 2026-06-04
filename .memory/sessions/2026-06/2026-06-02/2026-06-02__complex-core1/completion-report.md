# COMPLEX-CORE1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented `COMPLEX-CORE1` as a pure internal complex-number primitive and readback milestone for future Equation-first complex support.

## Changes

- Extended `src/lib/numeric/complex.ts` with reusable complex helpers.
- Added complex conjugate, argument, polar construction, integer powers, principal nth roots, and deterministic all nth roots.
- Exported `DEFAULT_EPSILON` and reused normalization for near-zero root/readback components.
- Added root/branch readback helpers for principal-root and all-branches cases.
- Added tests for arithmetic stability, floating normalization, roots, powers, branch ordering, and readback.
- Added a value-domain test showing complex branch readback can be described through `complex-core` facts without `DisplayOutcome` adoption.

## Boundaries Preserved

- No top-header `Complex` toggle.
- No complex parser or user-input complex literals.
- No Equation complex solving adoption.
- No stored complex variables.
- No complex Approximate mode.
- No `DisplayOutcome`, history, app-state, OOE, Rust, Tauri schema, or UI behavior change.

## Next

- `INEQUALITY-CORE1` should add the bounded inequality/interval/fact rail on the same value-domain substrate.
- `COMPLEX-EQUATION1` can later adopt these primitives behind the opt-in complex-domain toggle.
