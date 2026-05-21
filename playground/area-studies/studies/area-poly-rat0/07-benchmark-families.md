# AREA-POLY-RAT0 Benchmark Families

These are future challenge/reference families, not product parity claims and not current CI expectations.

## Family

Distinct rational linear denominator.

## Source

Calcwiz `POLY-RAT-CORE0`, SymPy partial-fraction tools, FriCAS fraction/partial-fraction packages, Giac/XCAS calculator-engine evidence.

## Intended Use

Candidate `INT-RAT1` correctness cases:

- `1/(x+1)`
- `1/(x-2)`
- `(3x+5)/((x+1)(x-2))`
- `1/(x^2-1)` after factorization into distinct linear factors

## Boundary Notes

Requires preserved denominator constraints and log absolute-value/domain readback policy.

## Adoption Status

Recommended for `INT-RAT1`.

## Family

Polynomial plus proper rational remainder.

## Source

Calcwiz polynomial division/GCD, SymPy/SymEngine rational cancellation, Maxima classic rational transforms.

## Intended Use

Cases such as:

- `(x^2+1)/(x+1)`
- `(x^3-x)/(x-1)`
- `(2x^2+3x+1)/(x+1)`

## Boundary Notes

Requires polynomial division before partial fractions and derivative verification after integration.

## Adoption Status

Recommended for `INT-RAT1` if implementation remains small.

## Family

Repeated linear factors.

## Source

SymPy partial fractions, FriCAS partial-fraction evidence, SageMath platform evidence.

## Intended Use

Future challenge cases:

- `1/(x+1)^2`
- `(x+2)/((x-1)^2(x+3))`

## Boundary Notes

Needs repeated-factor partial fractions and stronger square-free/factor readiness.

## Adoption Status

Deferred to `POLY-RAT-CORE1` or later.

## Family

Irreducible quadratic factors.

## Source

SymPy and Giac/XCAS rational integration context; FriCAS integration context.

## Intended Use

Future challenge cases:

- `1/(x^2+1)`
- `(2x+1)/(x^2+x+1)`

## Boundary Notes

Needs arctan/log splitting policy, real-domain explanation, and possibly complex-factor policy.

## Adoption Status

Deferred; not required for first `INT-RAT1`.

## Family

Unsupported shape and honesty cases.

## Source

Calcwiz bounded readiness policy and all source comparisons.

## Intended Use

Stop-case families:

- decimal coefficients
- multivariable rational functions
- over-cap degree
- unsupported factorization
- denominator safety failures in definite integrals

## Boundary Notes

These are trust cases. They should verify controlled stops, not feature wins.

## Adoption Status

Required for `INT-RAT1` testing.
