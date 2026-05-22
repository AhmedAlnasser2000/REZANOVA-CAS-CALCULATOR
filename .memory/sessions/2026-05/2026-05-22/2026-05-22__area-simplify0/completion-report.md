# AREA-SIMPLIFY0 Completion Report

date: 2026-05-22  
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

`AREA-SIMPLIFY0` completed a full synthesis study for normal-form, readback, and expression-equivalence policy before any `INT-RAT2` widening.

The study treats Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources. It does not execute source mirrors, copy source, or add product behavior.

## Output

- `playground/area-studies/studies/area-simplify0/README.md`
- `playground/area-studies/studies/area-simplify0/00-scope.md`
- `playground/area-studies/studies/area-simplify0/01-source-notes.md`
- `playground/area-studies/studies/area-simplify0/02-cross-source-comparison.md`
- `playground/area-studies/studies/area-simplify0/03-pattern-extraction.md`
- `playground/area-studies/studies/area-simplify0/04-calcwiz-fit-evaluation.md`
- `playground/area-studies/studies/area-simplify0/05-synthesis.md`
- `playground/area-studies/studies/area-simplify0/06-calcwiz-native-proposal.md`
- `playground/area-studies/studies/area-simplify0/07-benchmark-families.md`
- `playground/area-studies/studies/area-simplify0/08-risks.md`

## Decision

Recommended next move: `SIMPLIFY-CORE0`.

The study found that `INT-RAT2` should wait for shared policy over canonical/readable forms, equivalent-form trust, preserved denominator/domain facts, and rational/log/arctan readback.

## Deferred

- `INT-RAT2` until shared simplify/readback/equivalence policy exists.
- `CALC-RAT-READBACK0` because the blocker is broader than wording.
- `AREA-ASSUMPTIONS0` until domain/exclusion handling exceeds a bounded simplify policy.
- `AREA-POLY-ELIM0` until resultants/Grobner/elimination become immediate.
