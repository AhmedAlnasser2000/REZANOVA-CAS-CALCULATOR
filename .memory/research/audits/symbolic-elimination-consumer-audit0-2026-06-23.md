# SYMBOLIC-ELIMINATION-CONSUMER-AUDIT0

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

Audit current consumers and near-term candidates for the private elimination primitive:

- `src/lib/symbolic-engine/primitives/elimination/`

No production code changed in this audit.

## Current Proven Consumer

| Consumer | Current Use | Status |
| --- | --- | --- |
| `src/lib/equation/polynomial/system.ts` | Uses `eliminateBivariateResultantNodes(...)` for Polynomial 2x2 resultant projections. | Proven first consumer. Keep. |

The primitive is a MathJSON-first bridge over Algebra-owned exact resultant arithmetic. Algebra remains owner of exact polynomial/resultant representation and determinant code.

## Candidate Consumers

| Candidate | Current Local Mechanic | Fit | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Additional Polynomial system routes | Current product route is fixed 2x2 over `x`/`y`. | Plausible future extension. | High: broader systems need candidate generation, validation, UI/readback, and cap policy. | Defer until a product-facing system milestone asks for it. |
| Equation carrier elimination | Uses structural carrier substitution, not bivariate resultant projection. | Weak for v1. | High: carrier elimination is a different substitution/elimination mechanic and already consumes substitution primitive. | Do not migrate until a carrier-specific elimination primitive extension exists. |
| Algebra `polynomial-elimination/**` internals | Exact resultant arithmetic. | Not a consumer. | High: Symbolic primitive wraps Algebra; Algebra should not depend on the wrapper. | Keep Algebra as substrate owner. |
| Future auxiliary-variable equation solving | Would infer carriers or auxiliary variables from single equations. | Not current scope. | Very high: risks broad CAS behavior. | Defer; require explicit auxiliary-variable policy first. |
| Groebner-style or chained multivariable solving | Not present. | Not current scope. | Very high. | Defer outside primitive consumer expansion. |

## Findings

- Elimination has the cleanest and narrowest current adoption story.
- There is no strong second consumer yet. Forcing one would blur the line between resultant projection and carrier substitution.
- Consumer expansion for elimination should wait for real product pressure, not happen merely because the primitive exists.

## Recommended Next Milestone

No immediate implementation milestone is recommended.

If product pressure appears, choose one of:

- `SYMBOLIC-ELIMINATION-POLYNOMIAL-SYSTEM-PARITY1` for richer Polynomial system use;
- `SYMBOLIC-CARRIER-ELIMINATION-PRIMITIVE-EXTENSION1` only if carrier elimination repeatedly needs reusable elimination metadata beyond substitution.

## Verification For This Audit

- Source inspection: primitive imports, Polynomial 2x2 consumer, Algebra resultant core, and elimination-related tests.
- No runtime behavior changed.
