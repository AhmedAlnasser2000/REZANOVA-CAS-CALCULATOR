# AREA-POLY-RAT1 Pattern Extraction

## Pattern

Domain-gated expression conversion.

## Why It Matters

Every strong source separates raw expression syntax from polynomial/rational algorithm input. Without this, algorithms silently inherit parser ambiguity, decimal approximations, multivariable surprises, and domain mistakes.

## Smallest Bounded Translation

Calcwiz should keep a single conversion gate that returns exact one-variable rational-polynomial facts or a structured stop.

## Required Prerequisites

- Exact scalar policy.
- Variable and coefficient-domain facts.
- Degree/term caps.
- Decimal/multivariable/non-polynomial stop reasons.

## Risks

If feature code bypasses the gate, Calcwiz will accumulate local symbolic shortcuts that disagree.

## Pattern

Coefficient-domain facts before algorithm selection.

## Why It Matters

Square-free factorization, Grobner bases, resultants, and partial fractions all depend on whether coefficients live in integers, rationals, reals, algebraic extensions, finite fields, or expression domains.

## Smallest Bounded Translation

Add a compact Calcwiz coefficient-domain descriptor before broadening beyond exact rational coefficients.

## Required Prerequisites

- Exact rational scalar overflow/size policy.
- Clear rejection of decimals for exact algorithms.
- Future algebraic/complex/modular domain placeholders.

## Risks

Pretending number-backed rationals are a full domain model will break future exact linear algebra and elimination.

## Pattern

Factorization tiers.

## Why It Matters

Distinct rational linear factors are already enough for `INT-RAT1`, but repeated factors and irreducible quadratics need stronger substrate behavior. Square-free factorization is the next natural boundary.

## Smallest Bounded Translation

`POLY-RAT-CORE1` should add square-free/factor readiness plus repeated-linear and irreducible-quadratic partial-fraction readiness under strict caps.

## Required Prerequisites

- Square-free decomposition over exact rational coefficients.
- Factor multiplicity facts.
- Quadratic discriminant classification.
- Domain/readback policy for log/arctan terms.

## Risks

Putting repeated/quadratic logic straight into calculus would make the algebra unreusable and harder to audit.

## Pattern

Partial fractions as a substrate envelope.

## Why It Matters

Partial fractions decompose rational functions; they do not decide output trust, real-domain notes, antiderivative verification, or interval safety.

## Smallest Bounded Translation

Extend `rational-function-core` readiness envelopes first, then let calculus consume them through derivative verification later.

## Required Prerequisites

- Preserved denominator constraints.
- Typed decomposition terms.
- Stop reasons for repeated, quadratic, algebraic, multivariable, and cap overflow.

## Risks

Without a typed envelope, output may look exact while dropping domain facts.

## Pattern

Elimination as a separate capability tier.

## Why It Matters

Resultants and Grobner/elimination introduce variable ordering, ideal semantics, multivariate polynomial models, and solver expectations. They are not small rational-integration helpers.

## Smallest Bounded Translation

Plan `AREA-POLY-ELIM0` before any implementation, with tiny Playground-only feasibility if adopted.

## Required Prerequisites

- Multivariate polynomial data model.
- Term order policy.
- Exact coefficient-domain gates.
- Result-envelope stop reasons for systems.

## Risks

Starting elimination inside equation solving would create black-box CAS pressure.

## Pattern

Normal-form policy as a separate cross-cutting concern.

## Why It Matters

Rational cancellation, factorization, integration output, and equality checks depend on normal forms, but simplifying too aggressively can hide assumptions or make readback worse.

## Smallest Bounded Translation

If `POLY-RAT-CORE1` output becomes hard to trust or display, plan `AREA-SIMPLIFY0` before adding more visible calculus.

## Required Prerequisites

- Stable expression equivalence checks.
- Readability policy for factored/expanded/canceled forms.
- Domain-preserving cancellation notes.

## Risks

Simplification can become a hidden second solver if boundaries are not explicit.
