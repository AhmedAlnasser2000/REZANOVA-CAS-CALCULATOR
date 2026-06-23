# SYMBOLIC-FACTORIZATION-CONSUMER-AUDIT0

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

Audit current consumers and near-term candidates for the private factorization primitive:

- `src/lib/symbolic-engine/primitives/factorization/`

No production code changed in this audit.

## Current Proven Consumers

| Consumer | Current Use | Status |
| --- | --- | --- |
| `src/lib/equation/parameterized/factorable-polynomial.ts` | Uses explicit product decomposition from the primitive. | Proven. Keep. |
| `src/lib/equation/parameterized/symbolic-factor-patterns.ts` | Thin Equation adapter over primitive symbolic factor-pattern discovery. | Proven. Keep. |

Equation still owns solver routing, stop wording, LaTeX/readback, branch/domain facts, root construction, validation, and degree-12 boundaries.

## Candidate Consumers

| Candidate | Current Local Mechanic | Fit | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| `src/lib/symbolic-engine/factoring.ts` | Older symbolic-engine factoring facade. | Strong. | Medium-high: facade output spelling and public behavior may differ from Equation factorable needs. | Migrate only under a dedicated facade parity milestone. |
| `src/lib/algebra/symbolic-factor.ts` | Calls the older symbolic-engine factoring facade. | Indirect. | Medium-high: Algebra-facing callers inherit facade behavior. | Let it follow the facade migration, not first. |
| `src/lib/equation/isolation/peeling.ts` and selected-target isolation helpers | Local multiplicative shell/factor handling. | Partial. | High: isolation shell removal has rearrangement semantics and Valid When implications. | Defer until isolation-specific audit. |
| `src/lib/equation/substitution/inverse-isolation.ts` and related substitution route helpers | Local product/factor extraction around inverse routes. | Partial. | High: inverse route semantics and branch facts are more important than factor mechanics. | Audit only after substitution routes are stable. |
| `src/lib/algebra/polynomial-factor/**` | Exact-rational polynomial factorization. | Not a migration target. | High: Algebra-owned exact factorization is a different substrate. | Keep separate; Symbolic primitive may adapt outputs, not replace Algebra. |

## Findings

- The factorization primitive already owns the right Equation mechanics: explicit products, common carrier powers, safe difference-of-powers, grouping, and grouped affine-carrier quadratics.
- The next high-value consumer is the older `symbolic-engine/factoring.ts` facade, but it needs product-output parity rather than a direct swap.
- Isolation and inverse-substitution helpers are not obvious primitive consumers because they encode rearrangement and branch semantics.

## Recommended Next Milestone

`SYMBOLIC-FACTORIZATION-FACADE-PARITY1`

Suggested scope:

- migrate or partially delegate `src/lib/symbolic-engine/factoring.ts` to primitive mechanics;
- keep public facade output and tests stable;
- do not touch Algebra exact-rational factorization or Equation isolation paths.

## Verification For This Audit

- Source inspection: primitive imports, old symbolic-engine factoring facade, Algebra exact factorization, and Equation isolation/substitution factor mechanics.
- No runtime behavior changed.
