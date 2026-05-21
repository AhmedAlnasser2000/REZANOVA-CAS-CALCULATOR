# AREA-POLY-RAT0 Pattern Extraction

## Pattern

Domain-gated expression-to-polynomial conversion.

## Why It Matters

All serious sources avoid treating arbitrary expression trees as already-polynomial. They establish a polynomial/rational domain first, then run algorithms.

## Smallest Bounded Translation

Calcwiz should keep using `polynomial-core` and `rational-function-core` as the only recognized rational-integration input gate for `INT-RAT1`.

## Required Prerequisites

- Exact rational scalar parsing.
- One-variable AST extraction.
- Degree and complexity caps.
- Structured unsupported reasons.

## Risks

If calculus bypasses this gate, rational integration becomes another local symbolic workaround instead of a reusable substrate consumer.

## Pattern

Normalize and cancel rational functions before downstream use.

## Why It Matters

Rational integration, solving, simplification, and domain checks depend on a stable numerator/denominator view.

## Smallest Bounded Translation

Use `rational-function-core` normalization and denominator constraints before partial-fraction readiness.

## Required Prerequisites

- Polynomial division/GCD.
- Denominator nonzero facts.
- Product adapter fallback to preserve shipped behavior.

## Risks

Cancellation can hide domain exclusions if denominator constraints are not preserved.

## Pattern

Partial fractions as readiness, not integration by itself.

## Why It Matters

Partial fractions are a substrate that still needs calculus policy, verification, and domain readback.

## Smallest Bounded Translation

Use distinct rational linear decomposition only, then integrate terms through existing log/constant/polynomial rules in `INT-RAT1`.

## Required Prerequisites

- Proper rational-function check or polynomial division.
- Distinct rational linear factors.
- Coefficient solve for decomposition constants.
- Derivative verification after antiderivative construction.

## Risks

Repeated factors and irreducible quadratics are tempting to add immediately, but they require more policy and tests than the first slice needs.

## Pattern

Broad elimination is a separate capability tier.

## Why It Matters

FriCAS, SymPy, Giac/XCAS, and SageMath all point to Grobner/elimination as serious algebraic infrastructure. It should not be slipped into rational integration as a helper.

## Smallest Bounded Translation

Defer to a future `AREA-POLY-ELIM0` or `POLY-ELIM-CORE0`.

## Required Prerequisites

- Exact coefficient-domain policy.
- Multivariable polynomial model.
- Result envelope and stop-reason design for systems.

## Risks

Starting elimination too early would bend Calcwiz toward full-CAS parity pressure.
