# INEQUALITY-PREIMAGE-READBACK2 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Summary

Implemented `INEQUALITY-PREIMAGE-READBACK2` as the combined completion of pending inequality preimage work plus x-family periodic readback polish.

The milestone keeps Equation inequality solving Exact-only and real-ordered, while improving the readability and honesty of abs-affine periodic answers and bounded rational/nested finite preimages.

## User-Facing Behavior

- Abs-affine periodic inequalities such as `tan(|5x-4|)>1/2` now read back as `x`-alone branch families when the absolute-distance split is safe.
- Distance-family notation remains an internal/proof fallback rather than the preferred main answer.
- Periodic readback now uses calculator-style symbolic shifts such as `k\pi`, `2k\pi`, and `\frac{k\pi}{5}`.
- Tangent singularities, branch-index facts, period/step facts, and real-order notes remain in `Valid when`.
- The existing `EXACT` / `DECIMAL` / `BOTH` output-style setting now influences inverse-trig threshold readback.
- Bounded finite preimage routing is more consistent for supported polynomial/rational inners under `abs`, `sqrt`, `ln`/`log`, and `exp`.

## Boundaries Preserved

- No non-Equation inequality adoption.
- No Approximate inequality sampling.
- No Isolate inequality rearrangement.
- No graphing.
- No chained inequalities.
- No symbolic-parameter or multivariable inequality solving.
- No complex ordered inequalities.
- No OOE runtime behavior change.
- No Rust solver execution.

## Notes

- Periodic-over-rational and periodic-over-nonlinear-absolute preimages remain controlled stops.
- Tier 4 nonlinear periodic preimages such as `tan(sqrt(ln(1/x^2)))<=1` remain unsupported.
- The current abs-affine flattening intentionally uses branch-index families rather than pretending the absolute-distance function is globally affine-periodic in `x`.
