# SYMBOLIC-SUBSTITUTION-CONSUMER-AUDIT0

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

Audit current consumers and near-term candidates for the private substitution primitive:

- `src/lib/symbolic-engine/primitives/substitution/`

No production code changed in this audit.

## Current Proven Consumer

| Consumer | Current Use | Status |
| --- | --- | --- |
| `src/lib/equation/parameterized/carrier-elimination.ts` | Uses carrier power-basis substitution to construct reduced `u` equations. | Proven first consumer. Keep. |

Equation carrier elimination remains the semantic owner of carrier detection, route order, branch solving, stop wording, facts, and readback.

## Candidate Consumers

| Candidate | Current Local Mechanic | Fit | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| `src/lib/equation/polynomial/carrier-follow-on.ts` | Local `replaceCarrierNode` / exact subtree replacement around carrier follow-on. | Strong. | Medium: the current path depends on replacement count and target-free checks. | Extend primitive metadata if needed, then migrate under carrier-follow-on parity tests. |
| `src/lib/equation/polynomial/system.ts` | Local `substituteSymbolNode` and numeric pair substitution for projection/back-substitution/validation. | Partial. | Medium-high: numeric validation substitution is not the same as symbolic structural substitution. | Migrate only symbolic back-substitution if parity is clear; leave numeric pair validation local unless a numeric substitution primitive is scoped. |
| `src/lib/equation/substitution/**` | Local carrier replacement and substitution route mechanics. | Partial. | High: these modules encode solver families, invertibility, and stop semantics. | Audit family-by-family; do not bulk replace. |
| `src/lib/algebra/variable-memory/substitution.ts` | Stored-value substitution. | Weak for v1. | High: stored values have persistence/readback/protected-symbol policy. | Keep Algebra variable-memory-owned until a dedicated stored-substitution milestone. |
| `src/lib/algebra/polynomial-elimination/stored-constants.ts` | Stored constant substitution before Algebra resultant projection. | Partial. | Medium-high: Algebra owns exact polynomial input policy. | Consider only after Symbolic/Algebra boundary audit. |
| `src/lib/algebra/absolute-value/shared.ts` | Local first-match replacement in guarded absolute-value solving. | Weak. | High: branch semantics and guarded facts dominate. | Defer. |

## Findings

- The substitution primitive should expand by adding metadata and parity consumers, not by taking over every replacement helper.
- Stored variable substitution is intentionally not the same problem as structural carrier substitution.
- Numeric validation substitution in polynomial systems is also a different class of operation because it turns symbols into floating-point candidate values.

## Recommended Next Milestone

`SYMBOLIC-SUBSTITUTION-CONSUMER-PARITY1`

Suggested scope:

- migrate exact carrier subtree replacement in `polynomial/carrier-follow-on.ts`;
- add primitive metadata for replacement count and protected hits if parity requires it;
- leave stored variables, numeric candidate validation, and equation-substitution families untouched.

## Verification For This Audit

- Source inspection: `rg` over substitution primitive imports, local symbol/subtree replacement helpers, and stored substitution helpers.
- No runtime behavior changed.
