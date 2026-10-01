# INTEGRATION-EXPONENTIAL-RATIONAL-REPRESENTATION1

Status: backend verified; authorized source commit checkpoint. Backend, CRITICAL, root-only. Started 2026-09-30; continued 2026-10-01.

## Domain and contract

The caller supplies the registered certified first-level field F = Q(x)(t), t = exp(r), with nonconstant r in Q(x). Boundary validation replays exponential admission and checks the parent, rule and constant-field status. Neither matching names nor matching r derivatives establish construction compatibility. The input is an owned normalized field value. No parser, UI, public contract, dependency or legacy solver changes accompany this gate.

An immutable primitive contains v in F and finitely many all-roots logarithms. Each term stores a monic nonconstant square-free q in Q[z], reduced weight w in Q[z], reduced argument G in F[z], a quotient ring, a checked inverse witness, a nonzero norm and its Brown subresultant certificate. Reducible moduli remain rings. There is no principal branch, individual-root selection or new tower generator.

## Verification obligations

- The field derivative and every coefficient derivative of G carry independent dual-number evidence. The producing coefficient differentiation is never called by the verifier.
- The logarithmic derivative is Tr(w DG/G). Replay checks its quotient identity, the saved inverse and norm certificates, every multiplication-basis trace column and the independent Newton-sum identity.
- The final derivative must equal an explicitly supplied target. A structurally valid primitive or a stored verification flag grants no authority.
- Conditions preserve the construction's common/original exponent denominators, outer normal denominators, denominators in every numerator/denominator coefficient, norms and norm evaluation conditions. Only powers of the nowhere-zero exponential are removed from outer denominator restrictions. Zero-weight logs still retain their norm conditions.
- The rational primitive bridge explicitly converts owned coefficient values, preserves root-term order and weights, and checks the norm and original rational denominator conditions. The old primitive type is unchanged.

## Replay and resources

The separately tagged `exponential-rational-primitive`, version 1 envelope stores the complete differential construction, target, primitive, norm/inverse/trace/derivative evidence and conditions. A new internal differential decoder first replays a fresh construction, compares the full construction, then binds selected values to the explicitly expected owner. Existing fresh-owner decoder interfaces and behavior remain unchanged.

Decoding traverses the complete envelope under caller-supplied limits before nested processing. All arithmetic, validation and replay share the context. Each external verification/codec operation begins fresh proof state. Initial arithmetic limits are work 20 billion, allocation 1 trillion, bits 2,048 and degree 256. Tower/artifact bounds are 8 levels, depth 64, 100,000 nodes and 16 MiB. These are safeguards, not completeness claims or free-memory measurements.

## Acceptance

Candidate verification includes x/t coefficient dependence, reducible and irreducible constant moduli, a quintic modulus without roots, rational-root-log embedding, component-zero rejection, large coefficients, mutated proof evidence, foreign owners, same-derivative exponent shifts, producer-disabled replay, condition retention and exhaustion. This gate establishes representations and supplied-candidate verification; automatic decisions belong to the following gate.

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
