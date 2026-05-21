# AREA-POLY-RAT0 Completion Report

date: 2026-05-21  
primary_agent: codex  
primary_agent_model: gpt-5.5

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

`AREA-POLY-RAT0` completed the first real multi-source area study over polynomial and rational-function substrates.

The study compares Calcwiz's existing `POLY-RAT-CORE0` readiness against static source-context evidence from FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra.

## Output

- `playground/area-studies/studies/area-poly-rat0/README.md`
- `playground/area-studies/studies/area-poly-rat0/00-scope.md`
- `playground/area-studies/studies/area-poly-rat0/01-source-notes.md`
- `playground/area-studies/studies/area-poly-rat0/02-cross-source-comparison.md`
- `playground/area-studies/studies/area-poly-rat0/03-pattern-extraction.md`
- `playground/area-studies/studies/area-poly-rat0/04-calcwiz-fit-evaluation.md`
- `playground/area-studies/studies/area-poly-rat0/05-synthesis.md`
- `playground/area-studies/studies/area-poly-rat0/06-calcwiz-native-proposal.md`
- `playground/area-studies/studies/area-poly-rat0/07-benchmark-families.md`
- `playground/area-studies/studies/area-poly-rat0/08-risks.md`

## Decision

Recommended next move: `INT-RAT1`.

The first rational-integration slice should be bounded to one-variable exact rational functions with distinct rational linear partial fractions and derivative-backed verification.

## Deferred

- repeated-factor partial fractions
- irreducible quadratic partial fractions
- square-free factorization
- resultants
- Grobner/elimination
- exact linear algebra
- direct source-mirror code reuse
