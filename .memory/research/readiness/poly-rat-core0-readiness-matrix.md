# POLY-RAT-CORE0 Readiness Matrix

milestone: `POLY-RAT-CORE0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Summary

`POLY-RAT-CORE0` turns the polynomial/rational prerequisites found by `INT-CANDIDATE2` into shared internal substrates. As of `INT-RAT1`, the distinct-rational-linear partial-fraction slice is now consumed by stable calculus; broader rational integration remains deferred.

The milestone adds exact polynomial division/GCD, a one-variable exact rational-function normalization core, and bounded distinct-linear partial-fraction readiness. `INT-RAT1` adopts only that bounded slice for derivative-backed rational integration.

`POLY-RAT-CORE1` has since widened substrate readiness without changing stable calculus: repeated rational linear factors and irreducible quadratic denominator families are now typed internal rational-function facts, while `INT-RAT1` still consumes only distinct rational linear factors.

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
| Repeated-factor partial fractions | `ready-with-adapter` | `POLY-RAT-CORE1` adds typed repeated-linear readiness envelopes; stable calculus has not adopted them yet. |
| Irreducible quadratic partial fractions | `ready-with-adapter` | `POLY-RAT-CORE1` classifies irreducible quadratics over exact rationals and exposes derivative/residual readiness pieces; stable calculus has not adopted them yet. |
| Square-free factorization | `blocked` | Supported denominator-family facts can mark square-free status, but broad square-free factorization remains unavailable. |
| Resultants and Grobner/elimination | `defer` | Still postponed behind stronger polynomial algebra and exact coefficient-domain readiness. |
| Bounded rational integration adoption | `ready-with-adapter` | `INT-RAT1` consumes the distinct-rational-linear slice through derivative-backed verification. |
| Broad rational integration adoption | `blocked` | Repeated factors and irreducible quadratics are substrate-ready only; broad square-free/factorization and calculus adoption remain outside the adopted slice. |

## Consumer Notes

- `src/lib/algebra/polynomial-core.ts` is now the shared owner for exact division, GCD, primitive normalization, and coefficient arrays.
- `src/lib/algebra/rational-function-core.ts` is the internal rational-function substrate and partial-fraction readiness boundary.
- `src/lib/symbolic-engine/rational.ts` may use the new core for polynomial quotient cancellation, but it keeps the existing factor-map path to preserve shipped simplify/factor/LCD behavior.
- `src/lib/algebra/polynomial-factor-solve.ts` now reuses promoted polynomial helpers where behavior is identical.

## Sequencing Decision

`POLY-RAT-CORE0` made `INT-RAT1` feasible, and `INT-RAT1` now consumes the smallest safe rational-integration slice.

`AREA-POLY-RAT1` then widened the lens to the full polynomial/rational domain across Calcwiz plus the seven static mirrors. Its decision locks the next rational-substrate implementation milestone:

1. `POLY-RAT-CORE1` - complete: repeated factors, irreducible quadratic readiness, supported-family square-free facts, and stronger rational stop metadata.
2. `INT-RAT2` - potential next calculus consumer if repeated/quadratic antiderivative forms can be verified and read back honestly.

Future integration can now plan against `POLY-RAT-CORE1` substrate facts instead of adding calculus-local algebra. `INT-RAT2` should still stay bounded and must preserve derivative-backed verification, interval/domain safety, and no source-mirror execution.
