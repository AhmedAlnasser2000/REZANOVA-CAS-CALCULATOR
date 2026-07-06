# CALCULUS-LIMITS-GRUNTZ-CORPUS-HARDENING1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

Completed the ninth gate of the Limits Gruntz exposure arc as a seed-corpus hardening pass.

- Added `gruntz` as an allowed Limits corpus route expectation.
- Added three finite-bridge Gruntz seed cases for `exp(1/x)`:
  - right-hand approach to `0` resolves to `\infty`.
  - left-hand approach to `0` resolves to `0`.
  - two-sided approach to `0` stops with side-disagreement evidence.
- Updated the committed corpus validator expectation to 30 unique cases.
- Kept the large PDF/site corpus ingestion deferred until after broader Gruntz coverage.

## Boundary

- This milestone hardened corpus coverage and route assertions only.
- No new Limit algorithms, UI behavior, or public Display schema were added.
- Existing Gruntz route exposure from `CALCULUS-LIMITS-GRUNTZ-ORCHESTRATION1` remains the app-visible route.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-06.md`
- `.memory/sessions/2026-07/2026-07-06/2026-07-06__calculus-limits-gruntz-corpus-hardening1/`
