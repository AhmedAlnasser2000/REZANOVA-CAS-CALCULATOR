# RISCH-NORMAN-FOUNDATION-CHECKPOINT0

Date: 2026-06-28

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Checkpoint the current Risch-Norman foundation after the first adoption pass. This is a docs and durable-memory audit only:

- no runtime behavior changes
- no public `risch-norman` strategy
- no public Calculus result schema changes
- no Display, History, OOE, Tauri, persistence, or workspace shape changes
- no source-mirror runtime dependency

## Current Foundation

The Risch-Norman layer is now a bounded internal fallback and substrate, not a full Risch decision procedure.

Implemented substrate:

- selected-variable candidate profiling for affine exponential, positive-base exponential, sine/cosine pairs, and affine logs
- MathJSON coefficient field for exact-rational plus target-free symbolic coefficients
- bounded symbolic Gaussian-style linear solver with nonzero pivot fact collection
- direct/test-facing ansatz solvers for polynomial times affine exponential and paired sine/cosine spans
- affine-log readiness and later live affine-log correction
- guarded dispatch probe after Tier-I routes miss, surfaced through existing public strategy labels

Implemented live adoption:

- polynomial coefficient times affine `e^(a*v+b)` and positive-base `q^(a*v+b)`
- polynomial coefficient times affine `sin(a*v+b)` and `cos(a*v+b)`
- affine-log by-parts correction for `P(v)ln(a*v+b)` and `P(v)log(a*v+b)`
- all-or-nothing top-level linear combination combiner over existing Tier-I/RN successes
- polynomial times `e^(a*v+b)sin(c*v+d)` and `e^(a*v+b)cos(c*v+d)`
- symbolic affine two-factor `sin/cos` product-to-sum support
- bounded affine rational correction for `P(v)/(a*v+b)^k`, degree `<=6`, denominator powers `1..3`

Proof/adoption policy now established:

- existing Tier-I routes keep precedence
- RN runs only as a guarded internal fallback where approved
- symbolic RN outputs are adopted only by route-local proof evidence and visible facts
- numeric-confidence adoption is not allowed for symbolic RN results
- public readback continues to use existing strategies such as `integration-by-parts`, `direct-rule`, and `partial-fractions`

## Representative Covered Cases

- `(c*x^2+d*x+e)e^(a*x+b)`
- `(c*x+d)q^(a*x+b)` with positive non-unit base facts
- `(c*x^2+d)sin(a*x+b)`
- `(c*x^2+d*x+e)cos(a*x+b)`
- `x^2 ln(a*x+b)`
- `(c*x+d)log(a*x+b)`
- `(c*x^2+d*x+g)e^(a*x+b) + x^2sin(a*x+b)`
- `x^2 e^(a*x+b)sin(c*x+d)`
- `(c*x+d)e^(a*x+b)cos(k*x+m)`
- `sin(a*x+b)cos(c*x+d)`, `sin*sin`, and `cos*cos`
- `A/(A+x)` and bounded `P(v)/(a*v+b)^k` affine rational corrections

## Remaining Gaps

These are intentionally not closed by the foundation pass:

- full Risch decision procedure
- non-elementary certificates
- general Risch-Norman candidate-space search
- symbolic degeneracy case splitting such as branching on `a+c=0` versus `a+c\ne0`
- broad symbolic partial fractions, especially symbolic quadratic and mixed linear/quadratic denominators
- tangent/secant/cosecant/cotangent RN towers beyond existing Tier-I rule families
- log correction beyond affine arguments
- nested exp/log/trig towers such as `e^(sin(x))`
- mixed unrelated transcendental products outside the approved spans
- selected-variable-dependent coefficient fields
- algebraic extension towers and Euler substitutions
- public `risch-norman` strategy metadata or public schema surfacing

## Risk Notes

- RN is now useful for textbook and engineering symbolic-coefficient families, but it remains a bounded heuristic/ansatz layer.
- The coefficient field is intentionally smaller than a CAS coefficient domain. This keeps adoption explainable and stops unsupported expressions instead of pretending to solve them.
- Symbolic denominators and pivot facts are visible, but Calcwiz still does not perform broad assumption case splitting.
- Future widening should reuse the coefficient field, linear solver, route proof evidence, and supplement facts instead of adding new route-local mini-solvers.

## Recommended Next Layer

Recommended next work before broader RN breadth:

1. `RISCH-NORMAN-DEGENERACY-FACTS1`
   - Add a small internal fact/case substrate for symbolic degeneracies and pivot alternatives.
   - Goal: handle or clearly present cases such as `a-c=0`, `a+c=0`, or zero ansatz pivots without unsafe division.

2. `RISCH-NORMAN-ANSATZ-ORCHESTRATOR1`
   - Centralize candidate-space orchestration across exp, sin/cos, mixed exp-sincos, log correction, rational correction, and sums.
   - Goal: keep RN algorithmic as coverage grows rather than accumulating one-off dispatch probes.

3. `RISCH-NORMAN-SYMBOLIC-RATIONAL-QUADRATIC-AUDIT0`
   - Audit what symbolic quadratic rational support would require before implementing it.
   - Goal: avoid copying Tier-I exact-rational quadratic logic without discriminant/domain/factor facts.

After those, Calcwiz can consider wider RN families. Full Risch and non-elementary certificates should remain separate tracks.

## Closeout Statement

The foundational Risch-Norman layer is now established for the approved bounded target-free symbolic scope. It is not complete Risch-Norman in the CAS literature sense, but it has the reusable pieces needed to continue responsibly: coefficient representation, bounded linear solving, route-local proof evidence, visible facts, guarded dispatch, and a documented stop line.
