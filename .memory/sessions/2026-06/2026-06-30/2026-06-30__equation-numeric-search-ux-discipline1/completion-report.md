# EQUATION-NUMERIC-SEARCH-UX-DISCIPLINE1 Completion Report

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

Completed `EQUATION-NUMERIC-SEARCH-UX-DISCIPLINE1` as a focused Equation numeric UX/trust/performance polish milestone.

## Changes

- Nonlinear auto-search now runs progressively through the existing bounded windows and stops once a wider pass adds no new accepted roots or unique extraneous values.
- Numeric interval/search loops now reuse cached target-aware zero-form evaluators instead of reparsing the same LaTeX for every sample.
- Periodic numeric guidance auto-surfaces the existing Numeric Interval Solve panel without auto-running and without introducing a second solve action.
- Numeric details are split into clearer cards: hard `Domain and Exclusions`, sampled `Domain Probe`, `Search Diagnostics`, `Numeric Validation`, and textbook `Extraneous Solutions`.
- Diagnostic density now uses the existing Detailed Facts setting: compact by default, larger capped detail when enabled, and never dumps all samples.
- `useEquationRuntime.ts` stayed under the file-size ratchet by extracting the small numeric-panel visibility helper.

## Boundaries

- Normal Equation Solve/Run remains the only solve entry.
- No public result schema, Copy Result, Formula Viewer, History, OOE, Tauri, app-state, persisted schema, Statistics, Limits, Differentiation, Calculus, LRT, Hermite, or Risch-Norman implementation changes.
- Periodic interval guidance opens the existing panel for user bounds; it does not run numeric solving automatically.
