# EQUATION-REAL-NONLINEAR-NUMERIC-SEARCH1 Completion Report

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

Completed `EQUATION-REAL-NONLINEAR-NUMERIC-SEARCH1` as the next Equation numeric pivot milestone.

## Changes

- Added target-aware real nonlinear numeric fallback after exact symbolic/formula routes and deterministic numeric algebraic fallback miss.
- Reused the existing numeric interval mechanics with target-aware evaluation/refinement and local-minimum recovery.
- Auto-searches bounded real windows `[-10,10]`, `[-100,100]`, `[-1000,1000]`, and `[-10000,10000]` for numeric-ready non-periodic nonlinear or discontinuity-heavy Real equations.
- Returns validated approximate real roots with bounded-search wording, residuals, searched windows, domain/exclusion facts, and rejected-candidate evidence.
- Extracted numeric fallback sequencing from the large Equation symbolic dispatcher to keep the file-size ratchet satisfied.

## Boundaries

- Periodic/trig numeric fallback remains interval-first and is not auto-searched in this milestone.
- Complex numeric root display remains deferred.
- No Display, Formula Viewer, Copy Result, History, OOE, Tauri, app-state, persisted schema, Statistics, Limits, Differentiation, Calculus, LRT, Hermite, or Risch-Norman changes.
