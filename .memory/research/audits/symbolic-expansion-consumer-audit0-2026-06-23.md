# SYMBOLIC-EXPANSION-CONSUMER-AUDIT0

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

Audit current consumers and near-term candidates for the private expansion primitive:

- `src/lib/symbolic-engine/primitives/expansion/`

No production code changed in this audit.

## Current Proven Consumer

| Consumer | Current Use | Status |
| --- | --- | --- |
| `src/lib/equation/polynomial/carrier-follow-on.ts` | Uses `expandMathJsonNodeOrOriginal(...)` instead of the old local ComputeEngine expansion loop. | Proven first consumer. Keep. |

This consumer is intentionally narrow. It uses bounded MathJSON expansion to support carrier follow-on routes while leaving Equation in charge of route selection, branch facts, readback, and stops.

## Candidate Consumers

| Candidate | Current Local Mechanic | Fit | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| `src/lib/equation/parameterized/mixed-algebraic.ts` | Local `expandedProduct`, `expandAlgebraicNode`, and square/product expansion helpers. | Strong. Same bounded structural expansion shape. | Medium: mixed-algebraic branch semantics and readback must remain unchanged. | `SYMBOLIC-EXPANSION-CONSUMER-PARITY1` should test mixed-algebraic parity before migration. |
| `src/lib/symbolic-engine/mixed-factor/carriers.ts` | Local `expandOnce` using ComputeEngine expansion. | Strong. Same compartment and repeated expansion mechanics. | Medium: older `symbolic-engine/factoring.ts` facade and tests may rely on ComputeEngine-specific output spelling. | Migrate after a focused mixed-factor/factoring facade parity audit. |
| `src/lib/equation/polynomial/domain.ts` | ComputeEngine `expand()` plus simplify for domain/polynomial recognition. | Plausible. | Medium-high: domain classification can affect correctness facts. | Audit with polynomial-domain tests before replacing. |
| `src/lib/equation/guarded/algebra/radicals.ts` | ComputeEngine expansion in radical/power-lift flow. | Plausible but not first. | High: radical validity/fact semantics are route-owned. | Defer until guarded radical parity is explicitly scoped. |
| `src/lib/symbolic-engine/radical/denest.ts` | Local expansion for radical denesting. | Plausible. | High: denesting has semantic constraints beyond distribution. | Defer until radical primitive/simplification work is planned. |
| `src/lib/equation/inequality/**` | Local expansion/simplification in finite/relation paths. | Plausible. | High: inequality sign/domain semantics are not mere expansion. | Defer until inequality parity audit. |
| `src/lib/engine/math-engine/expression-prep.ts` | Calculate/user-command expansion. | Weak for now. | High: product action may intentionally mirror ComputeEngine behavior. | Do not migrate without a Calculate action-output parity milestone. |

## Findings

- Expansion is ready for additional consumers, but only through parity milestones.
- The best next candidate is Equation mixed-algebraic, because it duplicates bounded product/square expansion inside the same selected-target solver family.
- App-wide replacement of ComputeEngine `expand()` calls would be unsafe. Several occurrences are domain, radical, inequality, or product-action semantics rather than reusable expansion mechanics.

## Recommended Next Milestone

`SYMBOLIC-EXPANSION-CONSUMER-PARITY1`

Suggested scope:

- migrate `mixed-algebraic.ts` expansion helpers first;
- optionally migrate `symbolic-engine/mixed-factor/carriers.ts` only if its facade tests prove output parity;
- no Calculate action, inequality, radical, or domain migration in the same slice.

## Verification For This Audit

- Source inspection: `rg` over expansion-related names and ComputeEngine expansion calls.
- No runtime behavior changed.
