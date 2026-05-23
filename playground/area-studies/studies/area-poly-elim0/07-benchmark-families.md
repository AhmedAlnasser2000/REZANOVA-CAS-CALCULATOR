# AREA-POLY-ELIM0 Benchmark Families

## Family

Small two-variable linear/quadratic systems.

## Source

Calcwiz future synthetic cases, SymPy polynomial examples, Giac/XCAS calculator-style solve surfaces, and SageMath/Singular-style ideal examples.

## Intended Use

Check whether a future bounded `POLY-ELIM1` can produce one elimination polynomial while preserving candidate validation facts.

## Boundary Notes

Do not use as product tests until an implementation exists. These are challenge families only.

## Adoption Status

Research candidate.

## Family

Resultant elimination for two univariate-in-one-variable polynomials sharing a second parameter.

## Source

SymPy resultants, FriCAS algebra packages, Maxima classic resultant behavior, and Giac/XCAS resultant functions.

## Intended Use

Evaluate the smallest resultant implementation shape and stop conditions.

## Boundary Notes

Requires coefficient-domain and degree caps. Must not hide extraneous candidates.

## Adoption Status

Deferred behind `AREA-EXACT-LINEAR-ALGEBRA0`.

## Family

Lex-order Grobner elimination for very small ideals.

## Source

FriCAS Grobner/zero-dimensional ideal files, SymPy Grobner tools, SageMath/Singular integration, and Giac/XCAS `gbasis` evidence.

## Intended Use

Stress monomial ordering, exact arithmetic, and row-reduction needs.

## Boundary Notes

This is not ready for stable product adoption. It belongs in Playground after exact linear-algebra readiness.

## Adoption Status

Future Playground candidate.

## Family

Candidate-validation and domain-fact preservation after elimination.

## Source

Calcwiz assumptions fact spine, current equation candidate validation, and source mirror solve/elimination behavior.

## Intended Use

Ensure elimination does not produce unverified or domain-invalid answers.

## Boundary Notes

This family should pair every generated candidate with preserved assumptions and rejection facts.

## Adoption Status

Research candidate.
