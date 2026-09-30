# Differential arithmetic performance gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Outcome

Faster shared differential arithmetic and proof replay with unchanged exactness and capability. Checkpoints A and B pass both 5x targets and all broader regression tolerances. No checkpoint C proof-reuse changes are present.

Owned immutable differential values reuse recursive validation only within the same owner/operation. Monomial denominators use exact power cancellation, coefficient normalization and reconstructed identities; general denominators retain Euclidean normalization. Public signatures, orientations, evidence formats, independent derivative checks and result conditions are unchanged.

## Handoff

The user subsequently authorized the milestone commit; no push. Durable records: specification, roadmap, current state, decisions, journal, question records and this dossier. Accepted measurements and correctness/visual evidence are recorded in verification-summary.md and performance-results.md. The separately requested sigma spacing correction changes only the optional presentation. Finite exponential sums remain the next roadmap capability candidate; no next-gate implementation is authorized.
