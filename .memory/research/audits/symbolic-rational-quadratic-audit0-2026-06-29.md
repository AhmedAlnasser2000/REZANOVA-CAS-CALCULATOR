# SYMBOLIC-RATIONAL-QUADRATIC-AUDIT0

Date: 2026-06-29

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

Audit only. This milestone does not change runtime behavior, tests, public strategy labels, public Calculus result schemas, Display, History, OOE, Tauri, persistence, or workspace shapes.

The goal is to define the safe first implementation slice for symbolic quadratic rational integration after RN node-first/readback work, without rushing into broad symbolic partial fractions.

## Existing Support

Already live exact-rational support:

- Exact-rational completed-square quadratic reciprocal families, including repeated powers and numerator lifts in the bounded Tier-I rational routes.
- Exact-rational mixed linear/quadratic partial fractions through the rational-function core, with multiplicity caps and exact backcheck.
- Exact-rational repeated quadratic recurrences for powers already approved by Rubi Tier I.

Already live target-free symbolic support:

- Symbolic affine rational correction for `P(v)/(a*v+b)^k`, degree `<=6`, denominator powers `1..3`.
- Symbolic repeated-linear partial fraction slice for one squared affine factor times one ordinary affine factor.
- Symbolic reciprocal quadratic rule for `1/(a*v^2+b*v+c)` under generic irreducible-positive-discriminant facts, using an arctan readback.
- RN affine-log rational correction for matching affine denominator powers, not quadratic denominators.

## Gaps

Still missing for symbolic quadratic rationals:

- Degree-one numerator over a symbolic irreducible quadratic denominator.
- Repeated symbolic quadratic powers.
- Reducible symbolic quadratic case splitting into linear factors.
- Negative discriminant/log-form branches and zero-discriminant repeated-linear branches.
- Multiple symbolic quadratic factors or mixed symbolic linear/quadratic factor groups.
- Node-first rational partial-fraction decomposition over symbolic coefficient fields.
- A shared discriminant/factor fact substrate that can describe generic and degenerate cases without duplicating Equation-specific ownership.

## Safe First Implementation Slice

The safest next implementation should be:

`(A*v+B)/(a*v^2+b*v+c)` with target-free symbolic coefficients, selected variable `v`, and generic irreducible-positive-quadratic facts.

Planned generic facts:

- `a\ne0`
- `4ac-b^2>0`

Expected generic antiderivative form:

- derivative-numerator/log part from the component proportional to `2a*v+b`
- residual arctan part using `sqrt(4ac-b^2)`

This is the natural symbolic extension of the existing reciprocal quadratic rule. It also keeps overlap discipline clear:

- derivative-numerator-only cases may remain with substitution where already owned
- reducible quadratics should not be silently claimed by this generic arctan branch
- exact-rational routes keep precedence for concrete denominators

## Deferred Branches

Do not implement these in the first symbolic quadratic rational slice:

- `4ac-b^2=0`: repeated affine denominator branch
- `4ac-b^2<0`: log/atanh-style branch
- unknown symbolic sign with automatic case splitting
- repeated powers `(a*v^2+b*v+c)^k`, `k>=2`
- denominator products with symbolic quadratic factors
- broad symbolic factorization or square-free decomposition
- arbitrary numerator degree reduction against symbolic quadratics

## Prerequisites Before Implementation

Before implementing the first slice, verify or add:

- node-first antiderivative construction and readback for the combined log/arctan formula
- exact supplement facts for `a\ne0` and `4ac-b^2>0`
- route-local proof evidence rather than numeric-confidence adoption
- stop metadata for reducible/ambiguous symbolic quadratics
- tests for arbitrary selected variables
- readback checks that avoid decimal leakage, black-box MathLive output, and redundant sign clutter

## Recommended Next Milestone

Use a `1` implementation name, not audit `0`, for the first live slice:

`RN-SYMBOLIC-QUADRATIC-RATIONAL-LINEAR-NUMERATOR1`

Keep it bounded to one power-one symbolic quadratic denominator and degree-one numerator. Treat broader symbolic quadratic partial fractions as later work.
