# AREA-ASSUMPTIONS0 Benchmark Families

## Family

Rational cancellation exclusions.

## Source

Calcwiz rational-function core, SymPy continuous-domain examples, Giac/XCAS singularity handling.

## Intended Use

Cases like `(x^2-1)/(x-1) -> x+1` must preserve `x != 1`.

## Boundary Notes

This is a fact-preservation benchmark, not a demand for broader simplification.

## Adoption Status

Candidate for `ASSUMPTIONS-CORE0`.

## Family

Equation candidate rejection.

## Source

Calcwiz equation guards, SymPy `solveset(..., domain=S.Reals)`, Giac/XCAS solve singularity checks.

## Intended Use

Transformed equations must validate candidate roots against original denominators, radicals, logs, and branch constraints.

## Boundary Notes

No broad equation solving is implied.

## Adoption Status

Candidate for `ASSUMPTIONS-CORE0`.

## Family

Log/radical real-domain constraints.

## Source

Calcwiz `domain-range-core`, SymPy `continuous_domain`, Maxima radical/sign simplification examples.

## Intended Use

Facts for `ln(x+1)`, `sqrt(x-2)`, rational powers, and radical denominators should be preserved and displayable.

## Boundary Notes

Avoid full inequality solving; only adopt constraints produced by bounded owners.

## Adoption Status

Candidate for `ASSUMPTIONS-CORE0`.

## Family

Branch and principal-range facts.

## Source

Calcwiz `branch-core`, inverse-trig behavior, FriCAS typed/context evidence, Giac/XCAS branch warnings.

## Intended Use

Facts for principal roots, inverse trig ranges, periodic families, and abs branch splits should remain explicit.

## Boundary Notes

No general branch-cut theorem prover.

## Adoption Status

Candidate for `ASSUMPTIONS-CORE0`.

## Family

Limit and definite-integral interval hazards.

## Source

Calcwiz calculus interval safety, SymPy continuous-domain examples, Giac/XCAS singularity detection.

## Intended Use

Intervals crossing denominator zeros, log/radical boundaries, or one-sided real-domain gaps should stop honestly.

## Boundary Notes

Sampled safety and proved safety must stay distinct.

## Adoption Status

Candidate for `ASSUMPTIONS-CORE0`.

## Family

Table undefined rows and future graph holes.

## Source

Calcwiz table mode, GeoGebra CAS/graph workflow evidence, SymPy set/domain examples.

## Intended Use

Tables and future graphing should be able to mark undefined rows, holes, discontinuities, and excluded points using the same fact vocabulary.

## Boundary Notes

No graphing feature is added by this study.

## Adoption Status

Deferred consumer of `ASSUMPTIONS-CORE0`.

## Family

Readable-form trust.

## Source

Calcwiz `simplify-policy`, rational integration backchecks, SymPy refine/assumptions evidence.

## Intended Use

Readable forms such as partial fractions, log/arctan antiderivatives, canceled forms, or factored forms should say whether they are exact-normalized, derivative-verified, numeric-confidence, display-only, or blocked.

## Boundary Notes

Trust is not proof unless a bounded owner supplies proof.

## Adoption Status

Candidate for `ASSUMPTIONS-CORE0`.
