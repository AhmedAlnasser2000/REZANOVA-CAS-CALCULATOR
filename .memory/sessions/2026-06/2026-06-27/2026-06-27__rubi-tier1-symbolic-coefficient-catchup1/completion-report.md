# RUBI-TIER1-SYMBOLIC-COEFFICIENT-CATCHUP1 Completion Report

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

- Added variable-aware Calculus integral state for Indefinite, Definite, and Improper Integral screens using `integrationVariable`, defaulting to `x`.
- Added shared validation for single-symbol integration variables, including `theta`, while rejecting compound variables and reserved constants.
- Threaded the selected integration variable through generated preview, request building, protected variable substitution, parsing, symbolic integration dispatch, history/replay, and focused UI tests.
- Added exact symbolic-output hygiene for by-parts trig/exponential forms so exact antiderivatives do not leak decimal coefficients and avoid harmless nested function grouping.
- Added internal symbolic-coefficient helpers for target-free symbolic affine powers, reciprocals, trig/exp/log primitives, positive symbolic-base exponentials, derivative-present binomial substitution, bounded symbolic by-parts, repeated-linear partial fractions, and irreducible quadratic reciprocal forms.
- Routed symbolic adoption through rule proofs plus visible `Valid When`/supplement facts, not numeric-confidence adoption.
- Split exact by-parts and symbolic rational helpers into focused modules to stay under the file-size ratchet.

## Files Updated

- `src/lib/calculus/workspace/integral-variable.ts`
- Calculus workspace/runtime/engine integral state and tests
- `src/lib/symbolic-engine/integration/exact-parts.ts`
- `src/lib/symbolic-engine/integration/symbolic-coefficients.ts`
- `src/lib/symbolic-engine/integration/symbolic-rational.ts`
- symbolic integration dispatch, metadata, result plumbing, readback helpers, and focused tests
- Rubi roadmap and durable memory
