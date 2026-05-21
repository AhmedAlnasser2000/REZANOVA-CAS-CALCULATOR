# AREA-POLY-RAT0 Calcwiz Fit Evaluation

## Fit

`INT-RAT1` is relevant now as a bounded consumer of `POLY-RAT-CORE0`.

`POLY-RAT-CORE1` is relevant later if repeated factors, irreducible quadratics, square-free factorization, or stronger factor readiness become immediate blockers.

`AREA-SIMPLIFY0` is not the main next move for this area, but simplification should be watched as an adoption risk.

## Owner Layer

| Concern | Stable owner |
| --- | --- |
| Polynomial extraction/arithmetic/division/GCD | `src/lib/algebra/polynomial-core.ts` |
| Rational-function normalization and constraints | `src/lib/algebra/rational-function-core.ts` |
| Integration candidate/adoption metadata | `src/lib/calculus/*` and integration metadata helpers |
| Product result surface | existing Calculate/Calculus/Advanced Calc result adapters |
| Future broad algebra studies | `playground/area-studies/studies/*` |

## Bounded Version

`INT-RAT1` should support:

- exact one-variable rational functions
- polynomial part via division if needed
- proper rational remainders over distinct rational linear factors
- log-term antiderivatives for linear denominators
- derivative-backed verification
- detail notes that explain rational normalization and interval/domain honesty

## Stop Reasons

`INT-RAT1` should stop, not fallback silently, on:

- multivariable rational functions
- decimal coefficients
- over-cap degree or term complexity
- repeated denominator factors
- irreducible quadratic factors
- unsupported factorization
- unsafe real-domain intervals for definite integrals
- verification mismatch after antiderivative construction

## User Value

The first user-facing value is a trustworthy exact leap for common rational integrals such as decomposable simple quotients, while preserving Calcwiz's habit of honest unsupported stops.

This fits the workbench identity: exact when bounded, visible when verified, and explicit when blocked.
