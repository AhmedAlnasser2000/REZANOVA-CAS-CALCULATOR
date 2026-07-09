# RUBI-TIER1-TRIG-AFFINE-BASIC1 Completion Report

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

- Added exact-rational affine trig direct primitives for `sin(m*x+n)`, `cos(m*x+n)`, `tan(m*x+n)`, `cot(m*x+n)`, `sec(m*x+n)^2`, and `csc(m*x+n)^2`.
- Preserved visible `direct-rule` integration metadata and exact derivative backcheck adoption.
- Extended the differentiation engine only where needed for backcheck: `cot`, `sec`, `csc`, `ln(sin(u))`, and `ln(cos(u))`.
- Updated classifier trig/transcendental recognition so the route plan sees `cot`, `sec`, and `csc` forms.
- Updated the Compute Engine provenance core test from `tan(x)` to `sec(x)` because tangent is now app-owned while plain secant remains Compute Engine-only.

## Scope Kept Out

- No symbolic coefficient widening.
- No broad trig powers or trig products.
- No branch-sensitive trig analysis.
- No public Rubi metadata.
- No public Calculus strategy/result schema changes.
- No Display, History, OOE, Tauri, persistence, workspace, or UI changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-27.md`
- `.memory/research/roadmaps/rubi-integration-roadmap.md`
- `.memory/sessions/2026-06/2026-06-27/2026-06-27__rubi-tier1-trig-affine-basic1/`
