# AREA-ASSUMPTIONS0 Scope

## Capability Area

Domain, exclusion, branch, and trust policy for Calcwiz math results.

This area owns the facts that say when an expression or result is valid, where it is invalid, which branch/principal range was used, and how much trust Calcwiz has in an equivalent/readable form.

## Goal

Decide whether the next move should be `ASSUMPTIONS-CORE0`, `DOMAIN-FACTS0`, `BRANCH-POLICY0`, `AREA-POLY-ELIM0`, or `defer`.

The study should answer what smallest Calcwiz-native fact model can support near-term simplification, equations, rational functions, calculus, limits, tables, and graphing-readiness without copying an external CAS assumption system.

## In Scope

- Denominator exclusions.
- Real-domain constraints for logs, radicals, powers, inverse trig, and rational functions.
- Branch and principal-range facts for roots, inverse trig, logarithms, absolute values, and periodic families.
- Candidate rejection facts for equation solving.
- Interval hazards for limits and definite integrals.
- Table undefined-row and future graph discontinuity readiness.
- Display-only, exact-normalized, derivative-verified, and numeric-confidence trust levels.
- Calcwiz shipped surfaces plus the seven static context mirrors as evidence only.

## Out Of Scope

- No implementation of a stable assumptions core in this milestone.
- No new simplification, solving, integration, limit, table, graphing, or UI behavior.
- No source mirror execution, dependency install, submodule recursion, or copied source.
- No global mutable `assume(...)` user feature.
- No broad inequality solver.
- No complete branch-cut theorem prover.
- No parity target with FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, or GeoGebra.

## Prerequisite Check

| Prerequisite | Current status | Notes |
| --- | --- | --- |
| `domain-range-core` | ready-with-adapter | Gives real-domain constraints, one-sided domain checks, interval checks, and range proof helpers, but not a whole-result fact ledger. |
| `branch-core` | ready-with-adapter | Gives bounded branch bookkeeping for abs/principal/periodic families, but branch facts do not yet travel uniformly across all result envelopes. |
| `simplify-policy` | ready-with-adapter | Gives form intent, equivalence trust, and preserved facts; needs a richer fact source underneath it. |
| Equation domain/candidate guards | ready-with-adapter | Existing tests preserve exclusions and reject invalid candidates, but ownership is local to solving flows. |
| Rational-function exclusions | ready-with-adapter | Denominator constraints exist in the rational substrate, but propagation to all consumers is still ad hoc. |
| Definite-integral interval safety | ready-with-adapter | Current calculus stops unsafe real-domain intervals before numeric fallback. |
| Table undefined-row policy | blocked | Tables can evaluate rows, but there is no shared fact model for undefined rows and future graph breaks. |
| Graphing-readiness domain facts | defer | Graphing is not a stable product surface yet, but assumptions should be shaped so graphs can consume them later. |
| Global assumptions model | blocked | A broad assumption engine would be too heavy now; a scoped typed fact ledger is the bounded alternative. |
