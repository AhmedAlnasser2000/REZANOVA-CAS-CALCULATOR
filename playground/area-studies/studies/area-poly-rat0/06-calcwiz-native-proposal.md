# AREA-POLY-RAT0 Calcwiz-Native Proposal

## Proposal

Plan `INT-RAT1` as:

> bounded rational integration over normalized one-variable exact rational functions with distinct rational linear partial fractions and derivative-backed verification.

The milestone should add visible exact wins only where the existing substrate can prove the input shape and the constructed antiderivative.

## Stable Owner

- Algebra substrate: `src/lib/algebra/polynomial-core.ts`
- Rational substrate: `src/lib/algebra/rational-function-core.ts`
- Calculus integration adoption: `src/lib/calculus/`
- Result/readback surface: existing Calculate, Basic Calculus, and Advanced Calc adapters

## Playground Path

No Playground runner is required before `INT-RAT1`.

If integration design becomes uncertain, create a small Playground experiment that consumes stable `rational-function-core` shapes and emits candidate antiderivative plans, but keep it separate from source mirrors and product history.

## Acceptance Criteria

- Exact rational-integral wins for distinct-linear decomposable inputs.
- No change to unsupported integration families outside the slice.
- Existing non-rational integration behavior remains unchanged.
- Every unsupported rational shape returns a controlled stop or falls back only where current policy already allows it.
- Antiderivative derivative check passes before exact trust.
- Definite integrals still respect domain/range interval safety.

## Non-Goals

- No full partial-fraction engine.
- No repeated-factor support unless explicitly scoped.
- No irreducible quadratic/arctan expansion unless explicitly scoped.
- No resultants or Grobner/elimination.
- No exact matrix algebra.
- No source-mirror execution or copied code.
