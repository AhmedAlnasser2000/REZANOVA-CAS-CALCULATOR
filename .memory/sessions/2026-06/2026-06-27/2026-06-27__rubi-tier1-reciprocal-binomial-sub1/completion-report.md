# RUBI-TIER1-RECIPROCAL-BINOMIAL-SUB1 Completion Report

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

- Added exact-rational derivative-present reciprocal binomial substitution for `C*x^(-n-1)*(a+b*x^(-n))^p`.
- Added a scoped Laurent parser inside the integration binomial helper for exact inverse-power binomial bases and exact monomial derivative factors.
- Added a reciprocal-binomial priority check before derivative-ratio and partial-fractions so derivative-present overlaps keep visible `u-substitution`.
- Kept public Calculus integration strategies and result schemas unchanged.

## Scope Kept Out

- No symbolic coefficients.
- No decimal coefficient acceptance.
- No broad Laurent polynomial primitive or shared simplification/factorization widening.
- No public Rubi metadata.
- No Display, History, OOE, Tauri, workspace persistence, or UI changes.
- Missing derivative factors are not claimed by this route; existing rational routes may still solve them when already supported.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-27.md`
- `.memory/research/roadmaps/rubi-integration-roadmap.md`
- `.memory/sessions/2026-06/2026-06-27/2026-06-27__rubi-tier1-reciprocal-binomial-sub1/`
