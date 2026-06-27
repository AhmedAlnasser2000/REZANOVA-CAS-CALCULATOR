# EQUATION-COMPLEX-PRINCIPAL-IMAGE-INEQUALITY-SUBSTRATE1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Status

Implemented locally and verified as a backend substrate gate. Not committed yet; commit is pending explicit user approval.

## Summary

- Added an internal/test-facing principal-root image fact helper for Complex wrapper follow-up work.
- Square-root root-image facts use the principal half-plane condition `Re(R)>0 or (Re(R)=0 and Im(R)>=0)`.
- Higher nth-root image facts use the sector condition `R=0 or -pi/n < arg(R) <= pi/n`.
- The exact classifier proves obvious constants only: zero and positive real inside, negative real outside, square-root half-plane exact constants, and simple exact imaginary-axis cases.
- Unknown symbolic or non-obvious exact complex values remain guarded by a fact instead of being treated as proven.

## Boundaries

- No visible Complex root-wrapper solve output was enabled.
- No route-order changes were made.
- No Display, Formula Viewer, Copy Result, History, OOE, app-state, Tauri, persisted schema, or public runtime contract changes were made.

## Files Updated

- `src/lib/equation/roots/complex-principal-image.ts`
- `src/lib/equation/roots/complex-principal-image.test.ts`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-27.md`
- `.memory/research/roadmaps/equation-complex-wrapper-catchup-roadmap.md`
- `.memory/sessions/2026-06/2026-06-27/2026-06-27__equation-complex-principal-image-inequality-substrate1/`

## Handoff

- Next planned milestone: `EQUATION-COMPLEX-ROOT-WRAPPER-PRINCIPAL-IMAGE1`.
- That route should consume the new substrate to gate `sqrt(F)=R`, `root(F,n)=R`, and affine root-wrapper shells.
- Exact outside-principal-image RHS values should return a controlled no-solution error, while unknown symbolic RHS values should preserve the principal-image condition as a guarded fact.
