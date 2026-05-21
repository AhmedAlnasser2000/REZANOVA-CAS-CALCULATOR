# POLY-RAT-CORE0 Readiness Matrix

milestone: `POLY-RAT-CORE0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Summary

`POLY-RAT-CORE0` turns the polynomial/rational prerequisites found by `INT-CANDIDATE2` into shared internal substrates without adding visible rational integration behavior.

The milestone adds exact polynomial division/GCD, a one-variable exact rational-function normalization core, and bounded distinct-linear partial-fraction readiness. It does not adopt partial fractions into calculus or broaden shipped antiderivatives.

## Readiness Matrix

| Substrate | Status | Decision |
| --- | --- | --- |
| Polynomial division/remainder | `ready` | Shared exact division with quotient/remainder now lives in `polynomial-core`. |
| Polynomial GCD | `ready` | Shared monic Euclidean GCD over exact rational coefficients is available for one-variable bounded polynomials. |
| Coefficient arrays/build helpers | `ready` | Shared high-to-low coefficient arrays and coefficient-based builders replace duplicate local helper needs. |
| Content/primitive/monic normalization | `ready` | Primitive integer form and monic normalization are shared for bounded exact polynomial consumers. |
| Rational-function normalization | `ready-with-adapter` | `rational-function-core` normalizes/cancels one-variable exact rational functions through polynomial GCD while product rational simplification keeps existing fallback behavior. |
| Denominator constraints | `ready-with-adapter` | The rational-function core emits denominator nonzero constraints; product consumers may still preserve more granular existing factor-map exclusions. |
| Distinct-linear partial-fraction readiness | `ready-with-adapter` | Proper rational functions with distinct rational linear denominator factors can decompose internally for future integration planning. |
| Repeated-factor partial fractions | `blocked` | Repeated linear factors remain a controlled stop, not a hidden approximation. |
| Irreducible quadratic partial fractions | `blocked` | Quadratic real/complex factor decomposition remains out of scope for this pass. |
| Square-free factorization | `blocked` | Still needed before robust repeated-factor and broader exact factorization work. |
| Resultants and Grobner/elimination | `defer` | Still postponed behind stronger polynomial algebra and exact coefficient-domain readiness. |
| Rational integration adoption | `blocked` | `INT-RAT1` must explicitly consume the new readiness substrate; no calculus behavior changed here. |

## Consumer Notes

- `src/lib/algebra/polynomial-core.ts` is now the shared owner for exact division, GCD, primitive normalization, and coefficient arrays.
- `src/lib/algebra/rational-function-core.ts` is the internal rational-function substrate and partial-fraction readiness boundary.
- `src/lib/symbolic-engine/rational.ts` may use the new core for polynomial quotient cancellation, but it keeps the existing factor-map path to preserve shipped simplify/factor/LCD behavior.
- `src/lib/algebra/polynomial-factor-solve.ts` now reuses promoted polynomial helpers where behavior is identical.

## Sequencing Decision

`POLY-RAT-CORE0` makes `INT-RAT1` feasible to plan as a bounded rational-integration milestone, but does not make it automatic.

The next recommended native milestone is:

1. `INT-RAT1` - consume rational-function and distinct-linear partial-fraction readiness for a narrow verified rational integration slice.

If `INT-RAT1` needs repeated factors, irreducible quadratics, or square-free factorization, it should pause and plan a smaller `POLY-RAT-CORE1` prerequisite instead of adding calculus-local algebra.
