# AREA-POLY-RAT1

status: complete  
mode: full synthesis  
date: 2026-05-22  
predecessor: `AREA-POLY-RAT0`  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

`AREA-POLY-RAT1` is the full-domain polynomial/rational atlas after the narrower `AREA-POLY-RAT0` decision study.

`AREA-POLY-RAT0` answered whether Calcwiz could ship bounded `INT-RAT1`. This study maps the broader POLY/RAT domain across Calcwiz, FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra so future work is selected from a Calcwiz-native roadmap instead of from single-engine imitation or feature-parity pressure.

## Decision

Recommended next move: `POLY-RAT-CORE1`.

The next substrate leap should add bounded repeated-linear partial-fraction readiness, irreducible-quadratic readiness, square-free/factor readiness, and stronger rational-function stop metadata. `INT-RAT2` should wait until those substrate facts exist. `AREA-SIMPLIFY0` and `AREA-POLY-ELIM0` remain important, but they are not the immediate blocker for widening rational integration.

## Boundaries

- No source mirror execution.
- No copied external code.
- No product dependency on source mirrors.
- No stable math behavior change in this study.
- No Grobner/resultant/exact-linear-algebra implementation.
- No claim that Calcwiz should match any source mirror's breadth.

## Files

- `00-scope.md`
- `01-source-notes.md`
- `02-cross-source-comparison.md`
- `03-pattern-extraction.md`
- `04-calcwiz-fit-evaluation.md`
- `05-synthesis.md`
- `06-calcwiz-native-proposal.md`
- `07-benchmark-families.md`
- `08-risks.md`
