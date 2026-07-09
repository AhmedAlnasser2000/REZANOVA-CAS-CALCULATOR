# RUBI-TIER1-LINEAR-QUADRATIC-PF-LIFT2 Completion Report

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

- Lifted the exact-rational rational-function partial-fraction primitive to allow one irreducible quadratic factor group with multiplicity up to `3` alongside bounded exact-rational linear factors.
- Kept two-quadratic families at the existing multiplicity cap of `2`, with explicit controlled stops for over-cap mixed quadratic multiplicity.
- Scoped the larger exact coefficient solve to the rational partial-fractions path by allowing an 8x8 exact matrix solve there; the shared exact matrix default remains unchanged.
- Added verifier-local raw rational reduction after arithmetic so differentiated partial-fraction antiderivatives with repeated overlapping denominators can prove exact equality without public rational normalization degree blowup.
- Added rational-function and integration coverage for `1/(x^2+1)^3`, `(x+1)/((x-2)(x^2+1)^3)`, and the over-cap stop `1/((x^2+1)^3(x^2+4))`.

## Scope Kept Out

- No symbolic coefficient widening.
- No multiple-quadratic multiplicity lift beyond the existing cap of `2`.
- No broad quartic/factorization expansion.
- No new public `CalculusIntegrationStrategy`.
- No public Rubi metadata.
- No Display, History, OOE, Tauri, persistence, workspace, or result-shape changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-27.md`
- `.memory/research/roadmaps/rubi-integration-roadmap.md`
- `.memory/sessions/2026-06/2026-06-27/2026-06-27__rubi-tier1-linear-quadratic-pf-lift2/`
