# AREA-EXACT-LINEAR-ALGEBRA0 Scope

## Capability Area

Exact linear algebra over bounded rational coefficients:

- exact scalar policy
- exact matrix/vector representation
- determinant, rank, inverse, solve, row reduction, and RREF
- fraction-free Gaussian/Bareiss-style elimination
- coefficient-growth caps and stop metadata
- assumption/trust fact propagation

## Goal

Decide whether Calcwiz should implement an exact linear algebra core next, strengthen scalar arithmetic first, or keep exact linear algebra deferred.

The study must choose one next move:

- `EXACT-LINEAR-ALGEBRA1`
- `EXACT-SCALAR1`
- `MATRIX-EXACT1`
- `POLY-ELIM1`
- `defer`

## In Scope

- Current numeric Matrix/Vector core boundaries.
- Current `ExactScalar` support in polynomial/rational algebra.
- Exact rational matrix algorithms under strict caps.
- Fraction-free versus rational-normalized row operations.
- Result envelope, stop reasons, and assumption/trust facts.
- Static evidence from FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra.

## Out Of Scope

- Stable math behavior changes.
- Product Matrix/Vector UI changes.
- Exact matrix mode.
- Symbolic linear solving in Equation mode.
- Resultants, Grobner bases, or elimination implementation.
- Graphing.
- Source mirror execution or copied source.

## Prerequisite Check

Ready:

- reusable numeric Matrix and Vector cores
- bounded one-variable exact rational scalar helpers in `polynomial-core`
- result envelope/detail section infrastructure
- assumption fact spine

Missing:

- exact matrix value type
- exact vector value type
- exact row-reduction/RREF
- exact determinant/rank/inverse/solve
- coefficient-growth and denominator-growth caps
- exact linear algebra result metadata

Conclusion: a first internal exact rational matrix core can proceed as `EXACT-LINEAR-ALGEBRA1` under strict caps. Product-facing `MATRIX-EXACT1` and `POLY-ELIM1` should wait.
