# Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
  - user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Task Goal
- Add one coherent exact Matrix linear-map profile without a new workspace, Equation import, approximate fallback, or parallel elimination engine.

## What Changed
- Added `profileA` and `profileB`, with editor `profile(...)` support for named, inline, and computed matrices.
- Reused the Matrix-owned exact column-family analyzer for rank, nullity, pivots, kernel, and image bases.
- Added domain/codomain, rank-nullity, one-to-one/onto classifications with reasons, and square-only determinant/invertibility facts.
- Rectangular matrices explicitly say invertibility is not applicable instead of calling the map noninvertible.
- Added a collapsed `RREF Evidence` card, Matrix variable-hint recognition, History schema support, and the Shift-layer `profile` keypad template.
- Deduplicated the final readback so the Answer summary, Rank-Nullity Facts, Kernel, and Image cards each add distinct information.

## Runtime Impact
- Matrix keeps `linearAlgebra.matrix`; Vector remains unchanged and both continue sharing `linear-algebra-worker-runtime`.
- Exact execution is capped at 6 by 6 and stops explicitly above the exact elimination profile.
- F-keys, worker topology, Equation ownership, and automatic-routing policy are unchanged.

## Durable Memory Updated
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-10.md`
- `.memory/research/roadmaps/linear-algebra-vector-matrix-roadmap.md`
- this session dossier
