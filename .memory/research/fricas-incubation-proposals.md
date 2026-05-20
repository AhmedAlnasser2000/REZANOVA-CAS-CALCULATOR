# FriCAS First Incubation Proposals

milestone: FRICAS-CTX0  
date: 2026-05-01

## Proposal A: ALG-CAPS0 Capability Facts

- Concept from FriCAS: category/domain capability discipline.
- Do not inherit: FriCAS type system, runtime domain vectors, or global coercion.
- Calcwiz fit: kernel/algebra readiness metadata.
- Prototype path: Playground record with a table of current core capabilities and a validator that checks named prerequisites exist before a milestone claims readiness.
- Adoption measure: at least two future math milestones can reuse the same readiness language.

## Proposal B: POLY-CORE-AUDIT1

- Concept from FriCAS: polynomial category contracts.
- Do not inherit: full polynomial hierarchy.
- Calcwiz fit: algebra core.
- Prototype path: audit current polynomial functions against challenge families from FriCAS polynomial/Grobner inputs.
- Adoption measure: clear ready/blocked/defer matrix for gcd, factor, cancel, square-free, resultant, and rational-function normalization.

## Proposal C: INT-CANDIDATE2

- Concept from FriCAS: layered integration result objects.
- Do not inherit: broad Risch implementation.
- Calcwiz fit: calculus core.
- Prototype path: add internal-only richer candidate metadata in Playground or a guarded branch for current strategies.
- Adoption measure: existing Calcwiz integration cases keep output stable while failures gain clearer internal classes.

## Proposal D: LIM-SERIES-LAB0

- Concept from FriCAS: power-series and MRV routes for limits.
- Do not inherit: general MRV/asymptotic engine.
- Calcwiz fit: Playground first; possible future calculus core.
- Prototype path: bounded local-series expander for selected elementary forms already recognized by `CALC-LIM3`.
- Adoption measure: improves a small challenge corpus without changing unsafe/domain behavior.

## Proposal E: GROBNER-TINY0

- Concept from FriCAS: Grobner basis and normal form for polynomial systems.
- Do not inherit: general solving stack or regular-chain machinery.
- Calcwiz fit: Playground only until polynomial-core and branch/domain prerequisites mature.
- Prototype path: tiny rational-coefficient polynomial systems with strict degree/variable caps.
- Adoption measure: exact wins are explainable, bounded, and never replace existing solver honesty.

## Proposal F: VEC-MAT-AUDIT0 before MATRIX-EXACT0

- Concept from FriCAS: matrix operations gated by coefficient domain.
- Do not inherit: full matrix category tree.
- Calcwiz fit: future algebra core and result envelope, but only after current Matrix/Vector numeric workspaces are separated from reusable core responsibilities.
- Prototype path: first audit current vector/matrix modes, notation pads, numeric operation coverage, tests, and result envelopes; then decide whether `VEC-MAT-CORE0` should precede any exact rational matrix implementation.
- Adoption measure: Calcwiz has an explicit reusable vector/matrix boundary before exact determinant/rank/echelon/inverse work is considered.
