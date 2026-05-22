# AREA-POLY-RAT1 Synthesis

## Findings

The full-domain study confirms the user's premise: the mirrors should be used to understand the whole POLY/RAT landscape, not only tiny implementation slices.

The cross-source pattern is stable:

- exact polynomial/rational power comes from representation and domain discipline
- coefficient domains must be explicit before algorithms widen
- factorization is layered, and square-free/factor multiplicity is the next missing layer for Calcwiz
- partial fractions should be substrate facts consumed by calculus, not calculus-local logic
- resultants/Grobner/elimination are a separate future capability area
- simplification/normal-form policy is important but not the immediate blocker for repeated/quadratic rational readiness

## What To Carry Forward

- Research broadly across all mirrors before choosing substrate slices.
- Keep implementation sliced and Calcwiz-native.
- Promote repeated-factor and irreducible-quadratic readiness into `rational-function-core`, not calculus.
- Add stronger stop metadata before adding wider visible integration.
- Preserve source-mirror boundaries: context only, no execution, no code copying.

## What Not To Inherit

- A full FriCAS-style category/domain architecture.
- A SageMath-style multi-backend platform as a shortcut.
- SymPy-level API breadth without equivalent assumption handling.
- Maxima/Giac broad transform behavior without typed stops.
- SymEngine-driven core rewrite pressure before exact scope is known.
- GeoGebra product identity, UI assets, or service assumptions.

## Capability Boundary

Recommended immediate capability boundary:

- `POLY-RAT-CORE1` owns substrate widening only.
- `INT-RAT2` waits until `POLY-RAT-CORE1` exists.
- `AREA-SIMPLIFY0` is triggered if readback/equivalence policy blocks trustworthy output.
- `AREA-POLY-ELIM0` is triggered only when resultants/Grobner become a named blocker.

Deferred:

- broad multivariate polynomial algebra
- resultants and Grobner/elimination implementation
- exact linear algebra
- algebraic-number and modular coefficient domains
- Risch/Liouville integration
- source-mirror execution

## Decision

Recommended next move: `POLY-RAT-CORE1`.

Reason: current Calcwiz substrates can integrate distinct rational linear factors, but broader rational integration is blocked by repeated linear factors, irreducible quadratics, square-free/factor readiness, and clearer rational stop metadata. Those are core responsibilities and should be solved before `INT-RAT2`.
