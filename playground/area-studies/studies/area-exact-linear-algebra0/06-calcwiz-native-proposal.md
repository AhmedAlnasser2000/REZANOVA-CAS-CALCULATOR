# AREA-EXACT-LINEAR-ALGEBRA0 Calcwiz-Native Proposal

## Proposal

Implement `EXACT-LINEAR-ALGEBRA1` as the first bounded exact linear algebra core.

The first slice should be internal only and should not change Matrix/Vector product behavior.

## Stable Owner

`src/lib/linear-algebra/` should own the exact core, separate from current numeric matrix/vector modules.

## Playground Path

No Playground execution is required before `EXACT-LINEAR-ALGEBRA1`, but future elimination prototypes should consume the exact core through Playground before stable `POLY-ELIM1`.

## Acceptance Criteria

For `EXACT-LINEAR-ALGEBRA1`:

- exact rational matrix/vector values are typed
- operations are capped and deterministic
- determinant, RREF/rank, and square solve are tested directly
- stop reasons cover unsupported scalars, shape problems, singularity, underdetermined/inconsistent systems, and growth caps
- numeric Matrix/Vector product behavior remains unchanged
- exact linear algebra readiness updates from `defer` to `ready-with-adapter`

## Non-Goals

- no product Matrix exact mode
- no symbolic Equation linear-system feature
- no polynomial elimination
- no graphing
- no bigint scalar overhaul unless unavoidable
- no source-mirror execution or copied code
