# EQUATION-SPECIAL-FORM-ROOTS-FRONTIER1 Completion Report

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

Implemented the special-form roots frontier slice.

## Completed

- Split algebraic power caps so real Exact affine selected-target powers can solve through degree 12 while Complex power isolation remains at degree 4.
- Added `src/lib/equation/parameterized/special-form-roots.ts` for exact-rational pure-power carrier quadratics `u=x^n` with total degree `2n <= 12`.
- Routed `special-form-roots` as an internal/test-traced selected-target family after factorable polynomial and before generic fallbacks.
- Added tests for real affine degree 5/12 powers, degree-13 stops, Complex cap preservation, pure-power carrier successes, symbolic-carrier deferral, non-pure carrier stops, and route trace evidence.

## Out Of Scope Preserved

- No broad automatic factoring.
- No Cardano/Ferrari.
- No symbolic carrier coefficients.
- No affine or non-pure carrier substitution.
- No visible implicit roots.
- No numeric fallback as Exact closure.
- No OOE, Display/History schema, app-state, Tauri, graphing, step-by-step, or DAG/search-graph work.
