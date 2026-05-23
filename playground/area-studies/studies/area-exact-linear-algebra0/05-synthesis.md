# AREA-EXACT-LINEAR-ALGEBRA0 Synthesis

## Findings

Exact linear algebra is the right next substrate before `POLY-ELIM1`.

Calcwiz already has numeric matrix/vector cores and exact scalar helpers, but exact matrix algorithms are missing. Cross-source evidence confirms that exact determinant, row reduction, rank, and solve operations are foundational for elimination and polynomial-system work.

The current number-backed `ExactScalar` is not perfect, but it is sufficient for a first bounded implementation if `EXACT-LINEAR-ALGEBRA1` includes strict size and growth stops. A separate `EXACT-SCALAR1` can wait until real overflow/growth pressure appears.

## What To Carry Forward

- exact and numeric matrix cores must remain separate
- coefficient domain must be explicit
- row reduction must return pivots/rank metadata
- growth limits are part of correctness
- exact linear algebra should produce reusable envelopes
- product Matrix exact mode should wait for the internal core

## What Not To Inherit

- FriCAS's full type/category runtime
- SymPy's full `DomainMatrix` API
- Maxima's broad symbolic matrix command surface
- SageMath's multi-backend matrix platform
- Giac/XCAS's full calculator CAS matrix menu
- SymEngine-only core without Calcwiz readback/trust metadata
- GeoGebra graph/geometry-first sequencing

## Capability Boundary

Recommended first implementation boundary:

- internal exact rational matrix/vector core
- small matrices only
- current `ExactScalar` shape with growth caps
- determinant, RREF/rank, and square solve as core proof points
- no product UI adoption yet

Deferred:

- bigint rational scalar upgrade
- product Matrix exact mode
- symbolic Equation linear systems
- polynomial elimination
- graphing

## Decision

Recommended next move: `EXACT-LINEAR-ALGEBRA1`.

Reason: `EXACT-SCALAR1` is not a prerequisite for a tiny bounded core because current exact rationals can support small matrices under strict caps. `MATRIX-EXACT1` is too product-facing before the internal core exists. `POLY-ELIM1` still needs exact matrix operations first. `defer` would delay a substrate that now blocks multiple future lanes.
