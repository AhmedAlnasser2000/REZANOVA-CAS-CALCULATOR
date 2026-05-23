# AREA-POLY-ELIM0 Calcwiz-Native Proposal

## Proposal

Do not implement resultants or Grobner bases yet.

Open `AREA-LINALG0` next as a study-only exact linear-algebra prerequisite pass. That study should decide whether Calcwiz needs:

- exact rational matrix/vector data models
- fraction-free Gaussian elimination
- exact row-reduction
- determinant and rank over exact rationals
- coefficient-growth caps
- reusable result envelopes and assumption facts for exact linear algebra

After that, a future `POLY-ELIM1` can choose a bounded first implementation.

## Stable Owner

Potential future stable owners:

- `src/lib/linear-algebra/` for exact linear algebra, if adopted
- `src/lib/algebra/` for multivariate polynomial representation and elimination helpers
- equation mode as a consumer, not owner

## Playground Path

Before stable adoption:

- create a Playground prototype for multivariate polynomial representation
- seed resultants/Grobner benchmark families from area-study cases
- compare candidate algorithms only against Calcwiz-native envelopes
- keep source mirrors as static context only

## Acceptance Criteria

For `AREA-LINALG0`:

- maps exact scalar and exact matrix prerequisites across Calcwiz and mirrors
- recommends one next move: exact linear algebra implementation, smaller scalar prerequisite, or defer
- preserves the milestone numbering convention: study as `0`, implementation as `1`

For later `POLY-ELIM1`:

- one bounded elimination capability
- strict variable/degree/term caps
- exact coefficient-domain gate
- assumption-fact preservation
- no broad solver or CAS command surface

## Non-Goals

- no resultants in this milestone
- no Grobner bases in this milestone
- no graphing
- no source execution
- no copied code
- no public solver widening
- no feature parity with any source mirror
