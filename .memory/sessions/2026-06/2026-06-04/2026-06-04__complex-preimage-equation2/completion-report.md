# COMPLEX-PREIMAGE-EQUATION2 Completion Report

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

Implemented `COMPLEX-PREIMAGE-EQUATION2` as the next major Equation-only complex preimage expansion after `COMPLEX-PREIMAGE-EQUATION1`.

The milestone broadens exact rational clearing and adds true two-trig-layer branch families for `Exact + Complex On`, while keeping main answers concise and preserving the current complex/readback boundaries.

## Completed

- Improved periodic branch-family plumbing so nested complex trig routes can carry distinct integer parameters such as `k,n in Z`.
- Broadened finite rational preimages by clearing denominators when the resulting equation lands in supported exact linear, quadratic, polynomial, or bounded-power routes.
- Preserved the finite guarded composition cap of four layers for supported `ln` / `log`, `exp`, powers/roots, affine shells, and rational inners.
- Added true two-trig-layer complex preimages for outer `sin`, `cos`, and `tan` over inner `sin`, `cos`, and `tan`.
- Allowed inner trig arguments that are affine or bounded selected-target powers through degree 4.
- Kept main periodic answers concise with family notation and pushed expanded branch enumeration into collapsed detail sections.
- Added controlled stops for periodic-over-rational, degree-limit, multivariable, and deferred absolute-value complex locus cases.

## Boundaries Preserved

- No complex `Approximate` search.
- No complex `Isolate` solving.
- No stored complex values.
- No absolute-value complex locus solving.
- No non-Equation complex adoption.
- No broad complex-coefficient factorizer.
- No Cardano or Ferrari formulas.
- No numeric roots pretending to be exact.
- No OOE runtime behavior change.
- No Rust solver execution.

## Notes

This milestone intentionally leaves deeper wording and display cleanup for the paired `COMPLEX-PREIMAGE-READBACK1` and `COMPLEX-PREIMAGE-STABILITY1` pass. The capability expansion is in place, but the next pass should focus on branch-family wording, expanded-details polish, and regression hardening.
