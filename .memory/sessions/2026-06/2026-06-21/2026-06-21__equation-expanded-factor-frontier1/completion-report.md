# EQUATION-EXPANDED-FACTOR-FRONTIER1 Completion Report

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

Implemented the expanded exact-rational factorable frontier slice.

## Completed

- Added optional bounded settings to the Algebra polynomial-factor solve/factor APIs while preserving degree 4 as the default.
- Opted `factorable-polynomial.ts` into degree 12 for expanded exact-rational factorable solving only.
- Preserved explicit-product 12-slot behavior and existing root representation/readback surfaces.
- Added tests for default degree-4 behavior, opt-in degree-5/12 factoring, degree-13 stops, real quadratic remainders, complex-only quadratic remainder filtering, unsupported high-degree expanded polynomials, and cap-evidence updates.

## Out Of Scope Preserved

- No symbolic-coefficient expanded factorization.
- No broad automatic factoring.
- No Cardano/Ferrari.
- No visible implicit roots.
- No numeric fallback as Exact closure.
- No OOE, Display/History schema, app-state, Tauri, graphing, step-by-step, or DAG/search-graph work.
