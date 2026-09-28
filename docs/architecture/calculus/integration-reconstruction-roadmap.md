# Elementary Integration Reconstruction Roadmap

Date: 2026-09-27
Updated: 2026-09-28
Status: exact algebra, rational representation, automatic normalized-Q(x) integration and exact proof-performance targets are backend-verified private capabilities. Later-stage details and sequencing remain provisional and subject to change when necessary.

Companion: [refined blueprint](integration-reconstruction-blueprint.md).

The user approved replacing or rebuilding unsuitable foundations. This roadmap records direction and dependencies, not a fixed implementation specification, schedule, or completed design. Milestone boundaries may be combined, split, reordered, or renamed after investigation; document the reason. No implementation, dependency choice, subagent authorization, commit, or push is implied by this document capture.

## Investigation outcome and immediate next task

The user approved CRITICAL root-only `INTEGRATION-RECONSTRUCTION-DESIGN1`. The investigation is documented in the [design](integration-reconstruction-design.md) and [replacement inventory](integration-reconstruction-inventory.md). “Investigation” was this first design milestone, not an extra preliminary phase. The user explicitly authorized the earlier design checkpoint and subsequently the exact-algebra implementation checkpoint; no push is authorized.

Decisions for the next implementation: TypeScript/native bigint, private integration core, exact fields Q and Q(t), no new dependency, no replacement of shared scalar helpers in place, and no production dispatch changes in the first gate. The investigation found precision loss in existing scalar multiplication and identified algebraic-root output as a separate contract prerequisite.

**`INTEGRATION-EXACT-ALGEBRA1` is backend-verified and committed as `31561aab`** under its [specification](integration-exact-algebra1-spec.md), following the earlier design checkpoint `3c5a292a`.

**`INTEGRATION-RATIONAL-REPRESENTATION1` is backend-verified and committed as `89cbc176`**, with 84 focused tests at its checkpoint. The [representation specification](integration-rational-representation1-spec.md) records the ring/integral-domain/field distinction, verified Brown subresultants, square-free quotient units/CRT, exact local-complex root-log primitives, trace differentiation, retained conditions and private replay.

**`INTEGRATION-RATIONAL-DECISION1` is backend-verified and committed as `3a96622c`**, with 122 focused tests at that checkpoint. The [decision specification](integration-rational-decision1-spec.md) records automatic normalized-Q(x) primitives, exact conditions and full replayable Hermite/LRT derivations. There is no application caller.

**`INTEGRATION-RATIONAL-PROOF-PERFORMANCE1` is implemented and benchmark-verified**, with 138 focused tests, preserved v1 artifacts and mandatory exact proofs. Same-machine quintic medians improve complete integration 42.961 s → 3.215 s (13.36x), fresh verification 8.295 s → 0.059 s (140.14x), and decoding 8.952 s → 0.273 s (32.81x). All corpus operations pass the regression threshold. The [performance specification](integration-rational-proof-performance1-spec.md) records bounded operation-local caches, checked shared-denominator proof arithmetic and reproducible evidence. The user subsequently authorized this integration-only milestone commit; no push. Next: separately review rational adoption, including lowering/original exclusions, result authority and branch/display semantics.


## Updated implementation sequence

The first three foundation gates and their proof-performance follow-up are concrete. Later gates require their own algorithm/prerequisite review before execution and may be revised. Gates are backend unless UI is explicitly listed; backend completion does not imply product adoption.

| Stage | Milestone | Prerequisites and work | Exit evidence |
| --- | --- | --- | --- |
| 1 (backend verified; not adopted) | `INTEGRATION-EXACT-ALGEBRA1` | Implement bigint rationals, generic polynomials/fractions, GCD/extended GCD, square-free decomposition, rectangular exact linear systems and bounded artifacts; exercise Q(t) coefficients. | Backend: laws, reconstruction/residual identities, precision regressions, resource stops and private isolation. |
| 2 (backend verified; not adopted) | `INTEGRATION-RATIONAL-REPRESENTATION1` | Stage 1; ring/domain separation, Brown subresultants, square-free quotient units/CRT, formal root-log primitives, trace differentiation and private codec. | Backend: independent determinant oracles, checked candidate derivatives, retained conditions, mutation/resource/replay evidence; no app adoption. |
| 3 (backend verified; not adopted) | `INTEGRATION-RATIONAL-DECISION1` | Stages 1–2; Hermite reduction, residue extraction, LRT subresultant selection and specialization rules, automatic primitive construction for Q(x). | Backend: exact primitive/decomposition verification, full certificate replay, degree-loss/coverage mutations and shared-budget stops over normalized Q(x). |
| 3 follow-up (backend verified; not adopted) | `INTEGRATION-RATIONAL-PROOF-PERFORMANCE1` | Exact validation, operation-scoped immutable proof reuse and shared-denominator checking; preserve certificates and all limits. | Backend: both 5x targets exceeded, no material corpus regression, fresh v1 replay and adversarial trust/resource checks. |
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

- Stage 4: input lowering/original exclusions and product-facing algebraic-root/log-sum output; local-complex internal semantics are fixed in Stage 2, while branch/display policy and a standard encoding proof or explicit new result-contract approval remain prerequisites. The existing V4 governance wording also needs reconciliation before widening.
- Stage 5–6: effective constant-extension and dependency algorithms beyond Q and generic rational parameter fields; theorem hypotheses and complete lower-field RDE/limited-integration obligations.
- Stage 7–9: concrete integral-basis/local/divisor implementations and their effective-field requirements. General algorithms must not be replaced by genus-specific templates while retaining a completeness claim.
- Adoption/closeout: exceptional parameter partitions and bounded main-thread fallback behavior; decide exact runtime budgets using measured workloads.
- Native/WASM acceleration: reconsider only when measurements justify a separate implementation boundary. No such dependency is selected now.

These do not block the private foundations; they explicitly block the corresponding later guarantees. Update this roadmap and the design when those investigations settle them.

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
