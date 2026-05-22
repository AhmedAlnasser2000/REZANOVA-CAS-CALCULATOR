# POLY-RAT-CORE0 Readiness Matrix

milestone: `POLY-RAT-CORE0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Summary

`POLY-RAT-CORE0` turns the polynomial/rational prerequisites found by `INT-CANDIDATE2` into shared internal substrates. As of `INT-RAT1`, the distinct-rational-linear partial-fraction slice is now consumed by stable calculus; broader rational integration remains deferred.

The milestone adds exact polynomial division/GCD, a one-variable exact rational-function normalization core, and bounded distinct-linear partial-fraction readiness. `INT-RAT1` adopts only that bounded slice for derivative-backed rational integration.

## Readiness Matrix

| Substrate | Status | Decision |
| --- | --- | --- |
| Polynomial division/remainder | `ready` | Shared exact division with quotient/remainder now lives in `polynomial-core`. |
| Polynomial GCD | `ready` | Shared monic Euclidean GCD over exact rational coefficients is available for one-variable bounded polynomials. |
| Coefficient arrays/build helpers | `ready` | Shared high-to-low coefficient arrays and coefficient-based builders replace duplicate local helper needs. |
| Content/primitive/monic normalization | `ready` | Primitive integer form and monic normalization are shared for bounded exact polynomial consumers. |
| Rational-function normalization | `ready-with-adapter` | `rational-function-core` normalizes/cancels one-variable exact rational functions through polynomial GCD while product rational simplification keeps existing fallback behavior. |
| Denominator constraints | `ready-with-adapter` | The rational-function core emits denominator nonzero constraints; product consumers may still preserve more granular existing factor-map exclusions. |
| Distinct-linear partial-fraction readiness | `ready-with-adapter` | Proper rational functions with distinct rational linear denominator factors now feed `INT-RAT1` verified rational integration. |
| Repeated-factor partial fractions | `blocked` | Repeated linear factors remain a controlled stop, not a hidden approximation. |
| Irreducible quadratic partial fractions | `blocked` | Quadratic real/complex factor decomposition remains out of scope for this pass. |
| Square-free factorization | `blocked` | Still needed before robust repeated-factor and broader exact factorization work. |
| Resultants and Grobner/elimination | `defer` | Still postponed behind stronger polynomial algebra and exact coefficient-domain readiness. |
| Bounded rational integration adoption | `ready-with-adapter` | `INT-RAT1` consumes the distinct-rational-linear slice through derivative-backed verification. |
| Broad rational integration adoption | `blocked` | Repeated factors, irreducible quadratics, square-free factorization, and broader factorization remain outside the adopted slice. |

## Consumer Notes

- `src/lib/algebra/polynomial-core.ts` is now the shared owner for exact division, GCD, primitive normalization, and coefficient arrays.
- `src/lib/algebra/rational-function-core.ts` is the internal rational-function substrate and partial-fraction readiness boundary.
- `src/lib/symbolic-engine/rational.ts` may use the new core for polynomial quotient cancellation, but it keeps the existing factor-map path to preserve shipped simplify/factor/LCD behavior.
- `src/lib/algebra/polynomial-factor-solve.ts` now reuses promoted polynomial helpers where behavior is identical.

## Sequencing Decision

`POLY-RAT-CORE0` made `INT-RAT1` feasible, and `INT-RAT1` now consumes the smallest safe rational-integration slice.

`AREA-POLY-RAT1` then widened the lens to the full polynomial/rational domain across Calcwiz plus the seven static mirrors. Its decision locks the next rational-substrate implementation milestone:

1. `POLY-RAT-CORE1` - repeated factors, irreducible quadratic partial fractions, square-free/factor-multiplicity readiness, and stronger rational stop metadata.

If future integration needs repeated factors, irreducible quadratics, or square-free factorization, it should plan `POLY-RAT-CORE1` instead of adding calculus-local algebra. `INT-RAT2` should wait until those substrate facts exist.
