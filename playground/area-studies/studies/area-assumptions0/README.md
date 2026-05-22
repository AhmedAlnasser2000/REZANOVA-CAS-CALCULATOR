# AREA-ASSUMPTIONS0

status: complete  
mode: full synthesis  
date: 2026-05-22  
predecessor: `CALC-RAT-READBACK0`  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

`AREA-ASSUMPTIONS0` studies domain, exclusion, branch, and trust policy across Calcwiz plus FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static evidence sources.

This is not an integration-only study. It covers simplification, equations, calculus, limits, tables, graphing-readiness, and future algebra surfaces where Calcwiz must preserve facts such as denominator exclusions, real-domain constraints, branch/principal-range facts, candidate rejection reasons, interval hazards, and equivalence trust.

## Decision

Recommended next move: `ASSUMPTIONS-CORE0`.

The evidence says the next useful slice is broader than a denominator-only `DOMAIN-FACTS0` and broader than a branch-only `BRANCH-POLICY0`. Calcwiz needs one small typed fact model that can carry scoped assumptions, preserved domain/exclusion facts, branch/principal-range facts, and trust metadata through existing bounded modules before more algebra/calculus widening.

## Boundaries

- No stable math behavior changes.
- No source mirror execution.
- No copied external code.
- No product dependency on source mirrors.
- No Labs runner changes.
- No feature-parity promise with any mirror.

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
