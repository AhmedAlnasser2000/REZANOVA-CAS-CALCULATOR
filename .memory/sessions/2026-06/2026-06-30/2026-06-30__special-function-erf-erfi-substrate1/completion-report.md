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

`SPECIAL-FUNCTION-ERF-ERFI-SUBSTRATE1` added behavior-invisible special-function substrate support for `erf` and `erfi`.

## Changes

- Added direct symbolic differentiation rules for `erf(u)` and `erfi(u)`.
- Supported MathLive/ComputeEngine lowercase heads (`erf`, `erfi`) and internal capitalized heads (`Erf`, `Erfi`).
- Extended derivative preflight so these heads are direct symbolic routes, not Compute Engine fallback.
- Let certificate proof-local differentiation use those exact rules while keeping `Si`, `Ci`, `Ei`, and integration adoption out of scope.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-06/2026-06-30.md`
- `.memory/sessions/2026-06/2026-06-30/2026-06-30__special-function-erf-erfi-substrate1/`
