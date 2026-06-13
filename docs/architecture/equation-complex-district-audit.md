# Equation Complex District Audit

Status: audit note

Purpose: map the current `equation-complex` district before any structural split. This note is audit-only; it does not authorize new complex input syntax, new complex families, or reserved-symbol changes.

## Current Public Surface

- `solveBoundedComplexEquation(input)`: solves the currently supported Exact-mode complex Equation families when Complex intent is enabled.

The current production path is Equation mode through runtime controller settings. Complex Off remains real-first; explicit imaginary input in Real intent guides the user to enable Complex.

## Internal Responsibility Map

- Exact formatting helpers: scalar latex arithmetic, grouping, signs, exact rectangular/polar/cis forms, branch ordering, and branch readback.
- Polynomial complex routes: real linear/quadratic branches, negative-discriminant quadratics, factorable polynomial branches, bounded selected-target powers, and mixed real/complex branch visibility.
- Exact complex arithmetic: exact complex scalar normalization, addition, multiplication, division, powers, coefficient clearing, and exact approximation.
- Explicit complex constants: parsing `i` / `\imaginaryI`, powers of the imaginary unit, direct complex linear routes, and distinction from numeric one.
- Complex preimages: log, exp, rational inner clearing, affine/rational/power inner solving, and supported selected-target handoff.
- Trig preimages: direct sin/cos/tan families, angle-unit scaling, nested two-trig-layer families, independent integer parameters, and bounded selected-target power handoff.
- Outcome assembly: exact latex, approximate text, `Valid when` supplements, detail sections, route titles, answer-domain metadata, and unsupported-family guidance.

## Future Split Candidates

- `complex/format.ts`: exact latex arithmetic, rectangular/polar/cis forms, branch ordering, and readback helpers.
- `complex/exact-scalar.ts`: exact complex scalar operations and exact complex constants.
- `complex/polynomial.ts`: linear, quadratic, factorable polynomial, selected-target power, and branch-readback routes.
- `complex/preimage.ts`: log/exp/rational preimage solving and inner-equation handoff.
- `complex/trig-preimage.ts`: direct and nested trig preimage families, angle-unit scaling, and integer-parameter readback.
- `complex/outcome.ts`: supplements, details, answer-domain tagging, and unsupported-family guidance.

## High-Risk Contracts

- `i` and `\imaginaryI` remain reserved as the imaginary unit in Equation complex handling; do not add override syntax here.
- Complex Off must remain real-first and must not silently solve complex-only branches.
- Exact, Decimal, and Both output styles must preserve the current exact latex and approximate-text policy.
- Rectangular, polar, and cis exact forms must remain user-selectable through `complexExactForm`.
- Real roots must stay visible when Complex On adds complex-only branches.
- Unsupported complex preimage shapes must stop with guidance and must not fall through to unrelated real parameterized routes.
- `Approximate` and `Isolate` answer modes remain outside this Exact complex route.

## Test Gates

- `npm run test:unit -- src/lib/equation/equation-complex.test.ts`
- `npm run test:unit -- src/lib/equation/equation-target.test.ts src/lib/input/input-canonicalization.test.ts`
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`

## Stop Rules

- Do not implement `COMPLEX-INPUT1` or `COMPLEX-EQUATION3` in the district split.
- Do not broaden trig/log/exp solving as part of a file split.
- Do not change reserved-symbol policy for `i`, `j`, or `k`.
- Do not change Equation replay, history, OOE, runtime-host, or display policy.
- Do not fake exact answers for unsupported unfactorable cubic or quartic equations.
