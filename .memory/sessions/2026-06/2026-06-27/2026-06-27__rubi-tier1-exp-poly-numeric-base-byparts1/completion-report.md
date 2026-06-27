# RUBI-TIER1-EXP-POLY-NUMERIC-BASE-BYPARTS1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend

## Summary

- Extended the existing integration-by-parts exponential cascade from `e^(m*x+n)` to positive exact-rational numeric bases `a^(m*x+n)`.
- Added a focused helper module for the finite numeric-base recurrence so `rules.ts` remains under the file-size ratchet.
- Supported bounded polynomial factors, including expanded polynomial factors through the existing expanded by-parts feeder.
- Kept visible strategy as `integration-by-parts` and public Calculus/Rubi metadata unchanged.

## Boundaries

- No symbolic bases, zero/negative/decimal bases, exp-trig products, broad exp-log simplification, public Rubi metadata, or public Calculus strategy/result schema changes.
- No Display, History, OOE, Tauri, persistence, workspace, or UI changes.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-27.md`
- `.memory/research/roadmaps/rubi-integration-roadmap.md`
- `.memory/sessions/2026-06/2026-06-27/2026-06-27__rubi-tier1-exp-poly-numeric-base-byparts1/`
