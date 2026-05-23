# AREA-POLY-ELIM0 Scope

## Capability Area

Polynomial elimination over exact coefficients:

- resultants and subresultants
- Grobner bases
- elimination ideals
- multivariate polynomial-system solving
- exact coefficient-domain and exact linear-algebra prerequisites

## Goal

Map the smallest Calcwiz-native path toward elimination-style algebra without inheriting a mirror engine, copying code, or pretending Calcwiz is ready for broad multivariate CAS behavior.

The study must choose one next move from:

- `POLY-ELIM1`
- `AREA-LINALG0`
- `POLY-RAT2`
- `ASSUMPTIONS2`
- `defer`

## In Scope

- Current Calcwiz polynomial/rational readiness.
- Static source evidence from FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra.
- Univariate versus multivariate representation.
- Integer/rational coefficient-domain policy.
- Term and monomial ordering.
- Degree and term caps.
- Resultants, elimination ideals, Grobner-style solving, and polynomial-system decomposition.
- Exact scalar and exact linear algebra prerequisites.
- Assumption/domain fact preservation across elimination.
- A bounded implementation sequence after the study.

## Out Of Scope

- Product math behavior changes.
- Source mirror execution.
- Dependency installation in mirrors.
- Copied external source.
- Graphing work.
- Runtime CAS backend adoption.
- Broad feature parity with any mirror.

## Prerequisite Check

Ready:

- bounded one-variable exact rational polynomial core
- polynomial division/GCD for one-variable exact rationals
- rational-function normalization and denominator-family facts
- internal scoped assumption facts and visible fact readback

Not ready:

- reusable exact matrix/linear-system core over rational coefficients
- multivariate polynomial representation
- monomial ordering API
- coefficient-domain gate beyond current one-variable exact-rational use
- resultants/subresultants
- Grobner basis algorithms
- elimination-specific result envelopes and stops

Conclusion: the study should expect `AREA-LINALG0` unless evidence shows exact linear algebra is avoidable for the first useful elimination slice.
