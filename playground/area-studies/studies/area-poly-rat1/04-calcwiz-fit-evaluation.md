# AREA-POLY-RAT1 Calcwiz Fit Evaluation

## Fit

`POLY-RAT-CORE1` is the best immediate fit. It strengthens the existing Calcwiz-owned substrate before widening stable rational integration.

`AREA-SIMPLIFY0` is a near-term research fit if rational readback or equivalence policy becomes the blocker.

`AREA-POLY-ELIM0` is a later fit; resultants/Grobner/elimination require a different substrate class.

`INT-RAT2` is not ready as the next move because it would need repeated-factor and irreducible-quadratic facts that do not yet exist.

## Owner Layer

| Concern | Owner |
| --- | --- |
| Exact one-variable polynomial arithmetic | `src/lib/algebra/polynomial-core.ts` |
| Rational-function normalization and denominator constraints | `src/lib/algebra/rational-function-core.ts` |
| Bounded factor/factor-multiplicity readiness | future `POLY-RAT-CORE1` substrate |
| Stable calculus consumption | `src/lib/symbolic-engine/integration.ts` and calculus adapters |
| Simplification policy | future `AREA-SIMPLIFY0` / stable display-algebra boundary |
| Resultants/Grobner/elimination | future `AREA-POLY-ELIM0`, likely Playground first |

## Bounded Version

`POLY-RAT-CORE1` should stay bounded:

- exact one-variable rational coefficients only
- max degree/term caps
- square-free/factor-multiplicity facts for supported denominators
- repeated rational linear partial fractions
- irreducible quadratic classification and decomposition readiness
- typed stop reasons, not product behavior changes

## Stop Reasons

Future substrate stops should distinguish:

- non-exact decimal coefficients
- multivariable rational functions
- symbolic coefficients outside exact rationals
- degree/term cap overflow
- unsupported factorization
- repeated factors when a caller requests only distinct factors
- irreducible quadratics when a caller cannot consume arctan/log forms
- algebraic/complex roots outside current policy

## User Value

The user value is not immediate feature breadth. It is a safer path to future exact wins:

- rational integration can widen without local algebra hacks
- unsupported rational cases explain their actual blocker
- future simplification, solving, and exact linear algebra can reuse the same facts
- Calcwiz remains bounded and honest while learning from much broader systems
