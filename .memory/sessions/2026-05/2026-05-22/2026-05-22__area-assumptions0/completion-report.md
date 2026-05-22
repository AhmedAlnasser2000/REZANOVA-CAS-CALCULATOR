# AREA-ASSUMPTIONS0 Completion Report

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

`AREA-ASSUMPTIONS0` completed a full synthesis study for domain, exclusion, branch, and trust policy after `CALC-RAT-READBACK0`.

The study treats Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources. It does not execute source mirrors, copy source, or add product behavior.

## Output

- `playground/area-studies/studies/area-assumptions0/README.md`
- `playground/area-studies/studies/area-assumptions0/00-scope.md`
- `playground/area-studies/studies/area-assumptions0/01-source-notes.md`
- `playground/area-studies/studies/area-assumptions0/02-cross-source-comparison.md`
- `playground/area-studies/studies/area-assumptions0/03-pattern-extraction.md`
- `playground/area-studies/studies/area-assumptions0/04-calcwiz-fit-evaluation.md`
- `playground/area-studies/studies/area-assumptions0/05-synthesis.md`
- `playground/area-studies/studies/area-assumptions0/06-calcwiz-native-proposal.md`
- `playground/area-studies/studies/area-assumptions0/07-benchmark-families.md`
- `playground/area-studies/studies/area-assumptions0/08-risks.md`

## Decision

Recommended next move: `ASSUMPTIONS-CORE0`.

The study found that Calcwiz needs one small request-scoped, result-attached fact model for domain constraints, denominator exclusions, branch/principal-range choices, interval hazards, candidate rejection, and equivalence trust before more algebra/calculus/table/graphing-readiness widening.

## Deferred

- `DOMAIN-FACTS0` as too narrow for the current cross-surface need.
- `BRANCH-POLICY0` as too narrow for denominator/interval/trust facts.
- `AREA-POLY-ELIM0` until elimination/resultants become the immediate blocker.
- Public `assume(...)`, broad inequality solving, graphing behavior changes, and source-mirror execution.
