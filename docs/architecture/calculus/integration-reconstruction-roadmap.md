# Elementary Integration Reconstruction Roadmap

Date: 2026-09-26
Status: revised after `INTEGRATION-RECONSTRUCTION-DESIGN1`; implementation not started. Later-stage details and sequencing remain provisional and subject to change when evidence requires it.

Companion: [refined blueprint](integration-reconstruction-blueprint.md).

The user approved replacing or rebuilding unsuitable foundations. This roadmap records direction and dependencies, not a fixed implementation specification, schedule, or completed design. Milestone boundaries may be combined, split, reordered, or renamed after investigation; document the reason. No implementation, dependency choice, subagent authorization, commit, or push is implied by this document capture.

## Investigation outcome and immediate next task

The user approved CRITICAL root-only `INTEGRATION-RECONSTRUCTION-DESIGN1`. The investigation is documented in the [design](integration-reconstruction-design.md) and [replacement inventory](integration-reconstruction-inventory.md). “Investigation” was this first design milestone, not an extra preliminary phase. The user explicitly authorized the earlier design checkpoint and subsequently the exact-algebra implementation checkpoint; no push is authorized.

Decisions for the next implementation: TypeScript/native bigint, private integration core, exact fields Q and Q(t), no new dependency, no replacement of shared scalar helpers in place, and no production dispatch changes in the first gate. The investigation found precision loss in existing scalar multiplication and identified algebraic-root output as a separate contract prerequisite.

**`INTEGRATION-EXACT-ALGEBRA1` is backend-verified** under the user-approved [implementation specification](integration-exact-algebra1-spec.md): private Q/Q(t) algebra with mandatory identity checks, shared budgets and 60 focused tests. It has no production integration caller and is included in its user-approved milestone checkpoint. The earlier design checkpoint alone was committed with user approval as `3c5a292a`. Next: plan `INTEGRATION-RATIONAL-REPRESENTATION1`; no execution of that next gate is implied.

## Updated implementation sequence

The first gate is concrete. Later gates require their own algorithm/prerequisite review before execution and may be revised. Gates are backend unless UI is explicitly listed; backend completion does not imply product adoption.

| Stage | Milestone | Prerequisites and work | Exit evidence |
| --- | --- | --- | --- |
| 1 (backend verified; not adopted) | `INTEGRATION-EXACT-ALGEBRA1` | Implement bigint rationals, generic polynomials/fractions, GCD/extended GCD, square-free decomposition, rectangular exact linear systems and bounded artifacts; exercise Q(t) coefficients. | Backend: laws, reconstruction/residual identities, precision regressions, resource stops and private isolation. |
| 2 | `INTEGRATION-RATIONAL-REPRESENTATION1` | Stage 1; subresultants/resultants and exact internal algebraic-root-sum/logarithmic representation, including square-free component/unit handling. | Backend: polynomial/subresultant identities and replayable exact semantics; no display-name substitutes for roots. |
| 3 | `INTEGRATION-RATIONAL-DECISION1` | Stages 1–2; Hermite reduction and LRT logarithmic reconstruction for Q(x). | Backend: exact primitive/decomposition verification over the declared rational domain, with resource stops distinguished from incompleteness. |
| 4 | `INTEGRATION-RATIONAL-ADOPTION1` | Rational backend plus reviewed result representation; resolve standard-MathJSON encoding versus explicitly approved new contract, and reconcile V4 policy wording before any version widening. | Backend and UI: ordinary and algebraic-log output, conditions, copy/replay, worker cancellation/fallback, authority ratchets and Playwright. |
| 5 | `INTEGRATION-DIFFERENTIAL-FIELD1` | Exact fields and valid defining relations; generic parameter fields, derivations, relation-aware towers, constant-field hypotheses and input conversion. Pull algebraic arithmetic forward where required. | Backend: derivation/conversion laws, dependent generators, preserved exclusions and truthful unknown decisions. |
| 6 | `INTEGRATION-TRANSCENDENTAL-DECISION1` | Validated towers and required lower-field algorithms; recursive RDE bounds, limited integration, logarithmic derivatives and Liouville reductions. | Backend and UI on adoption: checked positive/negative certificates with explicit domain hypotheses. |
| 7 | `INTEGRATION-ALGEBRAIC-FIELD1` | Generic arithmetic/derivations; irreducible defining relations, basis arithmetic, exact inversion/differentiation and root/embedding semantics. May precede Stage 6 as its prerequisites require. | Backend: arithmetic/differential laws beyond quadratic radical templates. |
| 8 | `INTEGRATION-ALGEBRAIC-DECISION1` | Stage 7 and a reviewed algorithm dossier for integral bases, places, infinity, residues and the logarithmic/principal-divisor problem. | Backend and UI on adoption: exact reductions and justified decisions for the declared algebraic domain. |
| 9 | `INTEGRATION-MIXED-DECISION1` | Algebraic/transcendental algorithms over compatible differential coefficient fields; review each recursive subsidiary problem. | Backend and UI on adoption: both extension orderings, mixed identities/obstructions, conditions and controlled unknowns. |
| 10 | `INTEGRATION-RECONSTRUCTION-CLOSEOUT1` | Adopted replacement domains; wider parameter-specialization coverage, adversarial corpus, resource behavior and obsolete-route retirement. | Backend and UI: explicit guarantee/capability ledger, regression evidence, history/display/runtime preservation and justified broader gates. |

Parameters, branch interpretation, exact proof verification and mixed-field representation needs shape the design from the start. Later closeout widens coverage rather than introducing them. Keep the full long-term elementary integration ambition; describe each implemented domain honestly.

## Migration and verification rules

- Keep useful current integration behavior available while introducing the new core through explicit boundaries.
- Verified fast paths may remain. Complete decision authority must come from applicable field algorithms, not failed heuristics or finite ansatz searches.
- Retire replaced routes only after replacement evidence and consumer checks pass. Do not rebuild unrelated workspaces or merge their runtime ownership.
- Keep exact proofs separate from numerical confidence. Validate positive output conversion and retain hypotheses for negative certificates.
- Track implementation gaps, unsupported inputs, unresolved prerequisites, resource exhaustion, cancellation and invalid input honestly.
- Follow current canonical-result authority policy. Any necessary new result semantics require a reviewed contract change before producer adoption.
- Use affected tests and contract ratchets. App-visible mathematical gates require real Playwright visual evidence for answers/errors, conditions, details, and readability. Full suites belong at justified closeout boundaries.
- Record backend/UI evidence and durable memory at each meaningful gate. Commit boundaries follow approved milestones; commits and pushes still require explicit approval.

## Decisions remaining before later gates

- Stage 2–4: precise algebraic-root/log-sum output semantics and a standard encoding proof or explicit new result-contract approval. The existing V4 governance wording also needs reconciliation before widening.
- Stage 5–6: effective constant-extension and dependency algorithms beyond Q and generic rational parameter fields; theorem hypotheses and complete lower-field RDE/limited-integration obligations.
- Stage 7–9: concrete integral-basis/local/divisor implementations and their effective-field requirements. General algorithms must not be replaced by genus-specific templates while retaining a completeness claim.
- Adoption/closeout: exceptional parameter partitions and bounded main-thread fallback behavior; decide exact runtime budgets using measured workloads.
- Native/WASM acceleration: reconsider only when measurements justify a separate implementation boundary. No such dependency is selected now.

These do not block Stage 1; they explicitly block the corresponding later guarantees. Update this roadmap and the design when those investigations settle them.

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
