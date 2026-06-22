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

Extended the bounded Equation symbolic factor-pattern seam with additional factor-by-grouping cases while preserving the existing factorable/root readback route.

## Completed Work

- Added raw additive splitting for symbolic factor pattern discovery so grouped symbolic forms are not forced through whole-expression simplification first.
- Added shared selected-target carrier factor-by-grouping detection.
- Added monic grouped affine-carrier quadratic detection, including repeated linear carrier factors.
- Moved raw zero-side symbolic pattern detection before expanded exact-rational factoring for these bounded symbolic forms.
- Added focused factorable tests for shared-carrier grouping and grouped affine-carrier quadratics.

## Non-Goals

- No broad symbolic factoring.
- No residual degree above 2.
- No target-bearing coefficients, denominator factors, target-in-function factors, arbitrary grouping, or sum-of-powers.
- No Complex widening, Cardano/Ferrari, visible implicit roots, numeric Exact fallback, Display/History schemas, OOE/app-state/Tauri changes, graphing, step-by-step, or DAG/search graph.

## Manual QA Cases

- `x*(x+a)+b*(x+a)=0`
- `(x+c)^2+(a+b)*(x+c)+a*b=0`
- `(x+c)^2+2*a*(x+c)+a^2=0`
- `x^7-a*x^3=0` should still stop honestly.
