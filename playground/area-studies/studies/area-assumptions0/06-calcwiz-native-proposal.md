# AREA-ASSUMPTIONS0 Calcwiz-Native Proposal

## Proposal

Implement `ASSUMPTIONS-CORE0` as a small internal fact substrate.

The first pass should collect and normalize facts that Calcwiz already knows locally:

- denominator exclusions
- real-domain constraints
- branch/principal-range facts
- interval hazards
- candidate-rejection causes
- equivalence/readback trust

It should be metadata first. Stable behavior should change only when a later consumer milestone chooses a specific surface.

## Stable Owner

Primary stable owner:

- `src/lib/algebra/assumptions-core.ts`

Likely adapters:

- `src/lib/algebra/simplify-policy.ts`
- `src/lib/algebra/domain-range-core.ts`
- `src/lib/algebra/rational-function-core.ts`
- `src/lib/equation/*`
- `src/lib/calculus/*`
- future table/graphing adapters

## Playground Path

No Playground execution is required for `ASSUMPTIONS-CORE0`.

Future optional Playground work could add a visual fact-inspection runner, but that should wait until the core facts exist and the Labs runner policy explicitly allows the inspection shape.

## Acceptance Criteria

- A typed fact model exists for domain exclusions, domain constraints, branch facts, interval hazards, and trust facts.
- Facts are request-scoped and result-attachable.
- Merge/dedupe helpers keep facts stable and testable.
- Existing shipped math behavior is unchanged.
- Tests prove existing rational, equation, calculus, and simplify-policy behavior can emit or map facts without changing output.
- The model refuses unsupported/global assumptions.
- `AREA-ASSUMPTIONS0` remains research-only and no source mirror is imported or executed.

## Non-Goals

- No public `assume(...)` feature.
- No broad inequality solver.
- No general piecewise engine.
- No graphing implementation.
- No new result origins or strategy labels.
- No source-mirror execution or copied source.
- No parity target with FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, or GeoGebra.
