# AREA-POLY-RAT1 Benchmark Families

These are reference/challenge families, not product parity claims and not current CI expectations unless later promoted by a Calcwiz-native milestone.

## Family

Repeated rational linear denominators.

## Source

FriCAS full partial fractions, SymPy `apart`, Maxima rational integration reductions, Giac/XCAS integration context, Calcwiz `INT-RAT1` stop cases.

## Intended Use

Future `POLY-RAT-CORE1` and `INT-RAT2` challenge cases:

- `1/(x-1)^2`
- `(x+2)/((x-1)^2(x+3))`
- `(3x+1)/(x^2-2x+1)`

## Boundary Notes

Needs multiplicity facts, square-free/factor readiness, and log/rational-term output policy.

## Adoption Status

Recommended for `POLY-RAT-CORE1` as substrate tests, not immediate calculus adoption.

## Family

Irreducible quadratic denominators over the reals.

## Source

SymPy partial fractions, Maxima Hermite/Rothstein-Trager context, Giac/XCAS rational integration, FriCAS full partial fractions.

## Intended Use

Future readiness cases:

- `1/(x^2+1)`
- `(2x+1)/(x^2+x+1)`
- `(x+3)/((x-1)(x^2+1))`

## Boundary Notes

Needs real/complex policy, arctan/log split readiness, and verification before visible integration.

## Adoption Status

Recommended for `POLY-RAT-CORE1` readiness; stable integration waits for `INT-RAT2`.

## Family

Square-free and multiplicity classification.

## Source

FriCAS `multsqfr`, SymPy `sqfreetools`, Maxima factor/EZ-GCD, SageMath polynomial rings and Singular interfaces.

## Intended Use

Denominator classification tests:

- square-free product of distinct linear factors
- repeated linear factor
- repeated irreducible quadratic
- mixed linear/quadratic denominator

## Boundary Notes

Should expose factor/multiplicity facts without promising broad factorization.

## Adoption Status

Recommended for `POLY-RAT-CORE1`.

## Family

Resultants and elimination.

## Source

FriCAS Grobner/resultant context, SymPy resultants/Groebner, Maxima result/Grobner, SageMath Singular-backed ideals, Giac/XCAS elimination tests.

## Intended Use

Future `AREA-POLY-ELIM0` challenge families:

- two low-degree bivariate polynomials with one variable eliminated
- tiny lex-order Grobner examples
- geometry-derived polynomial systems

## Boundary Notes

Requires multivariate model, term order, exact coefficient-domain policy, and solver/result-envelope design.

## Adoption Status

Deferred to `AREA-POLY-ELIM0`.

## Family

Normal-form and cancellation honesty.

## Source

Calcwiz rational/domain constraints, SymPy rational tools, SymEngine cancellation tests, GeoGebra symbolic command tests.

## Intended Use

Future simplification/readback families:

- cancellation that preserves denominator exclusions
- factored-vs-expanded rational equality
- readable partial-fraction output
- cases where simplification should not hide assumptions

## Boundary Notes

May require `AREA-SIMPLIFY0` before broader visible rational features.

## Adoption Status

Watchlist; not the immediate next implementation milestone.
