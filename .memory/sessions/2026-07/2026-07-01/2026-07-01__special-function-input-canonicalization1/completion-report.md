# SPECIAL-FUNCTION-INPUT-CANONICALIZATION1 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate
- label: ui
- scope: user-facing Calculus special-function input canonicalization and roadmap setup.

## Completed
- Added Calculus-scoped canonicalization for `erf`, `erfi`, `Si`, `Ci`, `Ei`, `li`, `FresnelS`, and `FresnelC`.
- Covered typed/live input, paste, and Calculus Derivative/Integral screen hints without changing Equation shorthand behavior.
- Added UI coverage proving `Si(2x+1)` differentiates through the Derivative workspace as a special function rather than `S*i`.
- Added Integral workspace coverage proving unsupported `Si(2x+1)` remains a controlled unsupported antiderivative instead of a malformed symbol-product result.
- Added the dedicated transcendental Risch roadmap and aligned it to the approved ten-milestone sequence.

## Durable Memory Updated
- `.memory/research/roadmaps/transcendental-risch-roadmap.md`
- `.memory/sessions/2026-07/2026-07-01/2026-07-01__special-function-input-canonicalization1/`

## Memory Lane Note
- Shared `.memory/current-state.md`, `.memory/decisions.md`, and `.memory/journal/2026-07/2026-07-01.md` already contain unrelated active Surface/workspace dirty hunks. This milestone intentionally records its durable memory in the dedicated roadmap and session dossier to avoid staging another lane's memory changes.
