# EQUATION-DETERMINISTIC-NUMERIC-ALGEBRAIC1 + EQUATION-NUMERIC-DOMAIN-SEGMENTATION1 Completion Report

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

- Added exact-first deterministic numeric algebraic fallback for Equation symbolic Solve/Run when supported exact symbolic solving returns the unsupported-family stop.
- Numeric-ready single-target polynomial and rational equations can now return validated real approximate roots through degree `64` without requiring an arbitrary interval.
- Added an internal numeric domain segmentation substrate for denominator exclusions, solved pole exclusions, log domains, log-base facts, even-root and fractional-power domains, periodic/trig-pole facts, inverse-trig domains, and sampled discontinuity hazards.
- Fallback result details now state that no supported exact form was found, show the numeric method, preserve domain/exclusion facts, record residuals, and surface rejected/extraneous candidates.
- Target-aware candidate validation now works for selected targets such as `z` and for one-shot `Use Stored Values` substitutions while protecting the solve target.

## Scope Boundaries

- Exact symbolic routes still win first.
- Real approximate display only; Complex numeric root display remains deferred.
- Transcendental nonlinear search and interval-free periodic enumeration remain deferred.
- Segmentation facts are detail/evidence only in this milestone; they are not promoted to global `Valid When`.
- Algebra/F4 `Use Stored Values` remains substitution consent only, not a second solve mechanism.
- No Display, Formula Viewer, Copy Result, History, OOE, Tauri, app-state, persisted schema, or public result-schema changes.
- Unrelated active symbolic-engine/Risch-Norman files in the worktree were left untouched and unstaged by this milestone.

## Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-29.md`
- `.memory/research/roadmaps/calcwiz-numeric-methods-roadmap.md`
- `.memory/sessions/2026-06/2026-06-29/2026-06-29__equation-deterministic-numeric-algebraic-domain-segmentation1/completion-report.md`
- `.memory/sessions/2026-06/2026-06-29/2026-06-29__equation-deterministic-numeric-algebraic-domain-segmentation1/verification-summary.md`
