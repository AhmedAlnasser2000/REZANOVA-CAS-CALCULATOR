# AREA-POLY-RAT1 Completion Report

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

`AREA-POLY-RAT1` completed the full-domain polynomial/rational atlas after the narrower `AREA-POLY-RAT0` decision study.

The study treats Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources. It does not execute source mirrors, copy source, or add product behavior.

## Output

- `playground/area-studies/studies/area-poly-rat1/README.md`
- `playground/area-studies/studies/area-poly-rat1/00-scope.md`
- `playground/area-studies/studies/area-poly-rat1/01-source-notes.md`
- `playground/area-studies/studies/area-poly-rat1/02-cross-source-comparison.md`
- `playground/area-studies/studies/area-poly-rat1/03-pattern-extraction.md`
- `playground/area-studies/studies/area-poly-rat1/04-calcwiz-fit-evaluation.md`
- `playground/area-studies/studies/area-poly-rat1/05-synthesis.md`
- `playground/area-studies/studies/area-poly-rat1/06-calcwiz-native-proposal.md`
- `playground/area-studies/studies/area-poly-rat1/07-benchmark-families.md`
- `playground/area-studies/studies/area-poly-rat1/08-risks.md`

## Decision

Recommended next move: `POLY-RAT-CORE1`.

The next substrate milestone should handle repeated linear factors, irreducible quadratic readiness, square-free/factor-multiplicity facts, and stronger rational stop metadata before `INT-RAT2`.

## Deferred

- `INT-RAT2` until substrate readiness improves.
- `AREA-SIMPLIFY0` until normal-form/readback becomes the main blocker.
- `AREA-POLY-ELIM0` until resultants/Grobner/elimination become immediate.
- Exact linear algebra until its own core/area readiness exists.
