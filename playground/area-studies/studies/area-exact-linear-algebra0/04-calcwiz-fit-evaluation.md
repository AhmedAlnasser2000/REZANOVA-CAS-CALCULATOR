# AREA-EXACT-LINEAR-ALGEBRA0 Calcwiz Fit Evaluation

## Fit

`EXACT-LINEAR-ALGEBRA1` is a good next implementation slice if kept internal and small.

The current repo already has:

- numeric matrix/vector cores
- exact rational scalar helpers
- result envelopes
- assumption facts
- clear separation between product mode and reusable core

## Owner Layer

Primary owner:

- `src/lib/linear-algebra/`

Consumers later:

- polynomial elimination
- Equation symbolic solving
- product Matrix mode

## Bounded Version

First implementation should support only small exact rational matrices:

- shape validation
- exact add/subtract/multiply/transpose
- determinant
- row reduction/RREF with pivots
- rank
- square linear solve
- typed stops for singular, inconsistent, underdetermined, over-cap, and coefficient-growth cases

## Stop Reasons

Likely stops:

- non-rectangular-matrix
- unsupported-scalar-domain
- matrix-size-limit
- coefficient-growth-limit
- denominator-growth-limit
- singular-matrix
- inconsistent-system
- underdetermined-system
- unsupported-operation

## User Value

The first value is not visible product UI. It is making future exact Matrix and polynomial-elimination work reusable, testable, and honest.
