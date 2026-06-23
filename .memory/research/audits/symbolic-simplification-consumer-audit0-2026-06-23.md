# SYMBOLIC-SIMPLIFICATION-CONSUMER-AUDIT0

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

Audit current consumers and near-term candidates for the private simplification primitive:

- `src/lib/symbolic-engine/primitives/simplification/`

No production code changed in this audit.

## Current Proven Consumer

| Consumer | Current Use | Status |
| --- | --- | --- |
| `src/lib/symbolic-engine/primitives/factorization/node-helpers.ts` | Uses structural simplification helpers, additive-term splitting, and structural keys. | Proven first consumer. Keep. |

The primitive is structural and bounded. It is not final-answer readback polish.

## Candidate Consumers

| Candidate | Current Local Mechanic | Fit | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| `src/lib/equation/parameterized/math-json.ts` | Shared Equation MathJSON arithmetic helpers backed by ComputeEngine simplify. | Strong. | Medium-high: many parameterized routes depend on output shape and readback parity. | Best next simplification consumer after a focused parity milestone. |
| `src/lib/equation/parameterized/carrier-elimination.ts` | Local simplification, additive-term splitting, and structural keys. | Strong. | Medium: route was recently migrated to substitution primitive; avoid stacking too many semantic changes. | Migrate after `math-json.ts` or in a tightly scoped carrier-elimination parity slice. |
| `src/lib/equation/polynomial/carrier-follow-on.ts` | Local `simplifyNode` via ComputeEngine. | Plausible. | Medium-high: complex carrier follow-on readback has known polish debt. | Defer until consumer parity or readback-polish stage. |
| `src/lib/equation/parameterized/linear.ts` | Local raw-shape arithmetic helpers. | Partial. | High: earlier work deliberately kept linear arithmetic local pending parity audit. | Keep local until a dedicated linear parity audit clears it. |
| `src/lib/equation/substitution/**` | Local term keys, additive splitting, flattening. | Partial. | High: substitution route semantics and invertibility checks dominate. | Audit family-by-family. |
| `src/lib/symbolic-engine/differentiation.ts` | Local derivative simplification. | Plausible but later. | Medium-high: derivative output shape may be user-facing. | Defer until differentiation parity milestone. |
| `src/lib/algebra/**` radical/polynomial-factor helpers | Local exact-domain simplification. | Weak for now. | High: Algebra owns exact-rational/radical semantics. | Keep Algebra-owned until migration is explicitly scoped. |

## Findings

- Simplification has the largest consumer pressure of the five primitives.
- The safest next move is not final-answer polish; it is internal consumer parity for shared Equation MathJSON arithmetic.
- Readback issues such as `0 + ...`, reducible scalar fragments, and equivalent radical spelling remain a separate later readback-polish track after primitive consumer expansion.

## Recommended Next Milestone

`SYMBOLIC-SIMPLIFICATION-CONSUMER-PARITY1`

Suggested scope:

- evaluate/migrate `src/lib/equation/parameterized/math-json.ts` to the primitive helpers where output parity holds;
- run broad focused Equation parameterized tests;
- leave final-answer readback, linear raw-shape arithmetic, Algebra exact domains, and Display surfaces untouched.

## Verification For This Audit

- Source inspection: primitive imports, Equation parameterized arithmetic, carrier elimination, carrier follow-on, substitution routes, differentiation, and Algebra simplification helpers.
- No runtime behavior changed.
