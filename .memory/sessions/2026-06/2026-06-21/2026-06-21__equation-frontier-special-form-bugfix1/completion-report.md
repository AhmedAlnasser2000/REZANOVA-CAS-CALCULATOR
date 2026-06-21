# EQUATION-FRONTIER-SPECIAL-FORM-BUGFIX1 Completion Report

Date: 2026-06-21

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live implementation

## Summary

Fixed the first QA regressions after the expanded-factor and special-form frontier commits.

## Completed

- Changed live Equation input normalization so unbraced multi-digit numeric powers such as `^12` become `^{12}` before app-state solving.
- Kept the MathLive field editing-friendly; the field itself is not rewritten on each input stroke.
- Routed single-target real Exact pure-power carrier quadratics through `special-form-roots` before the older shared symbolic fallback.
- Added a Complex boundary stop for high-degree special-form roots so Complex On does not return partial real-only roots.
- Added regression tests for input canonicalization, MathEditor input, full Equation route successes, and Complex special-form stops.

## Out Of Scope Preserved

- No broad automatic factoring.
- No Complex high-degree frontier expansion.
- No visible implicit roots.
- No numeric fallback as Exact closure.
- No Display/History schema, OOE, app-state persistence, Tauri, graphing, step-by-step, or DAG/search-graph work.
