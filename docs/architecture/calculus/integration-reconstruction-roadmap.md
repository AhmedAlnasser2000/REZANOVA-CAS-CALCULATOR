# Elementary Integration Reconstruction Roadmap

Current program (2026-10-06): user approved unified canonical-result consolidation,
wire 7. The subsequent user-approved scope revision defers unfinished old-workspace
migrations and global retirement. Current authority for New Equation, rational New
Integration and Graphing analysis, shared consumers/actions and scoped persistence
cleanup are now verified prerequisites for exponential result projection and adoption. See
[consolidation specification](../result-contract/consolidation-spec.md).
The pre-v0.5.0 compatibility requirement is removed; private mathematical verification
and current artifact replay remain mandatory. The focused migration is verified;
New Integration still executes rational inputs only. Sequencing remains provisional.

Date: 2026-09-27
Updated: 2026-10-06
Status: exact algebra, rational representation, automatic normalized-Q(x) integration and exact proof-performance targets are verified and adopted through New Integration; rational presentation refinement is committed in `1b7ab181`. The differential-field foundation is committed in `6cd21935`; the rational-RDE prerequisite is committed as `9f222979`. The single-product hyperexponential decision gate is committed as `b4517300`. Differential arithmetic performance is committed as `49848767` with both 5x targets exceeded. Finite one-family exponential sums are committed in `c5dce1e2`. The exponential-rational representation gate landed in `d2281e6e`; the complete one-generator rational decision gate is verified with replayable positive/negative evidence. Nested arithmetic performance now exceeds both 5x targets (10.25x/10.99x), resolves the selected quadratic/inverse input-growth failures and covers 481 core tests; no application adoption or push accompanies them. Later-stage details and sequencing remain provisional and subject to change when necessary.

Companion: [refined blueprint](integration-reconstruction-blueprint.md).

The user approved replacing or rebuilding unsuitable foundations. This roadmap records direction and dependencies, not a fixed implementation specification, schedule, or completed design. Milestone boundaries may be combined, split, reordered, or renamed after investigation; document the reason. No implementation, dependency choice, subagent authorization, commit, or push is implied by this document capture.

## Investigation outcome and immediate next task

The user approved CRITICAL root-only `INTEGRATION-RECONSTRUCTION-DESIGN1`. The investigation is documented in the [design](integration-reconstruction-design.md) and [replacement inventory](integration-reconstruction-inventory.md). “Investigation” was this first design milestone, not an extra preliminary phase. The user explicitly authorized the earlier design checkpoint and subsequently the exact-algebra implementation checkpoint; no push is authorized.

Decisions for the next implementation: TypeScript/native bigint, private integration core, exact fields Q and Q(t), no new dependency, no replacement of shared scalar helpers in place, and no production dispatch changes in the first gate. The investigation found precision loss in existing scalar multiplication and identified algebraic-root output as a separate contract prerequisite.

**`INTEGRATION-EXACT-ALGEBRA1` is backend-verified and committed as `31561aab`** under its [specification](integration-exact-algebra1-spec.md), following the earlier design checkpoint `3c5a292a`.

**`INTEGRATION-RATIONAL-REPRESENTATION1` is backend-verified and committed as `89cbc176`**, with 84 focused tests at its checkpoint. The [representation specification](integration-rational-representation1-spec.md) records the ring/integral-domain/field distinction, verified Brown subresultants, square-free quotient units/CRT, exact local-complex root-log primitives, trace differentiation, retained conditions and private replay.

**`INTEGRATION-RATIONAL-DECISION1` is backend-verified and committed as `3a96622c`**, with 122 focused tests at that checkpoint. The [decision specification](integration-rational-decision1-spec.md) records automatic normalized-Q(x) primitives, exact conditions and full replayable Hermite/LRT derivations. This kernel is now adopted through the separately verified New Integration boundary.

**`INTEGRATION-RATIONAL-PROOF-PERFORMANCE1` is implemented and benchmark-verified**, with 138 focused tests, preserved v1 artifacts and mandatory exact proofs. Same-machine quintic medians improve complete integration 42.961 s → 3.215 s (13.36x), fresh verification 8.295 s → 0.059 s (140.14x), and decoding 8.952 s → 0.273 s (32.81x). All corpus operations pass the regression threshold. The [performance specification](integration-rational-proof-performance1-spec.md) records bounded operation-local caches, checked shared-denominator proof arithmetic and reproducible evidence. The user subsequently authorized this integration-only milestone commit; no push. The user approved the two ordered result-contract/adoption gates; both are now verified and user-authorized for commit (see below).


**2026-09-29 adoption posture:** `INTEGRATION-RATIONAL-RESULT-CONTRACT1` adds the V5 formal rational-antiderivative representation; `INTEGRATION-RATIONAL-ADOPTION1` exposes New Integration in independent launcher tabs, with exact source lowering, worker-only execution, retained exclusions, drafts and replayable artifacts. See the [result contract](integration-rational-result-contract1-spec.md) and [adoption specification](integration-rational-adoption1-spec.md). Focused verification and real-app evidence are in their separate dossiers. Both gates are complete: the authority/display and Calculate type blockers are resolved without exemptions. Commit authorized; no push. Old Calculus remains available. Further work and roadmap sequencing remain subject to change when necessary.

**2026-09-30 differential-field posture:** the [field specification](integration-differential-field1-spec.md) fixes the approved Q-only, backend-only boundary. Formal arithmetic and certified function admission are distinct; no automatic transcendental integration or application adoption is implied.

**2026-10-05 approved adoption sequence:** [general checked exponential normalization](integration-exponential-normalization1-spec.md) first, then the bounded V6 exponential result contract, then New Integration adoption. Normalization is backend-verified (515 core tests, independent replay and serial observations); the UI remains rational-only. The user selected general hidden common-factor discovery across families before testing the surviving one-family boundary. No commits or pushes accompany implementation.

**2026-10-05 user-directed stop:** complete normalization only, then discuss catching up with the cloud branch. Normalization was subsequently committed at `b80aef7e`; authorized synchronization incorporates cloud main through `7b85f646`, including Equation V6, presentation and New Equation adoption. The earlier Integration V6 designation is superseded. Result-contract and UI execution are on hold until repository/contract reconciliation; no automatic version renumbering.

## Updated implementation sequence

The first three foundation gates and their proof-performance follow-up are concrete. Later gates require their own algorithm/prerequisite review before execution and may be revised. Gates are backend unless UI is explicitly listed; backend completion does not imply product adoption.

| Stage | Milestone | Prerequisites and work | Exit evidence |
| --- | --- | --- | --- |
| 1 (backend verified; adopted in New Integration) | `INTEGRATION-EXACT-ALGEBRA1` | Implement bigint rationals, generic polynomials/fractions, GCD/extended GCD, square-free decomposition, rectangular exact linear systems and bounded artifacts; exercise Q(t) coefficients. | Backend: laws, reconstruction/residual identities, precision regressions, resource stops and private isolation. |
| 2 (backend verified; adopted in New Integration) | `INTEGRATION-RATIONAL-REPRESENTATION1` | Stage 1; ring/domain separation, Brown subresultants, square-free quotient units/CRT, formal root-log primitives, trace differentiation and private codec. | Backend: independent determinant oracles, checked candidate derivatives, retained conditions, mutation/resource/replay evidence; no app adoption. |
| 3 (backend verified; adopted in New Integration) | `INTEGRATION-RATIONAL-DECISION1` | Stages 1–2; Hermite reduction, residue extraction, LRT subresultant selection and specialization rules, automatic primitive construction for Q(x). | Backend: exact primitive/decomposition verification, full certificate replay, degree-loss/coverage mutations and shared-budget stops over normalized Q(x). |
| 3 follow-up (backend verified; adopted in New Integration) | `INTEGRATION-RATIONAL-PROOF-PERFORMANCE1` | Exact validation, operation-scoped immutable proof reuse and shared-denominator checking; preserve certificates and all limits. | Backend: both 5x targets exceeded, no material corpus regression, fresh v1 replay and adversarial trust/resource checks. |
| 4 prerequisite (backend verified) | `INTEGRATION-RATIONAL-RESULT-CONTRACT1` | Exact V5 all-roots primitive and V2 ordinary-result adapters; standard MathJSON leaves and explicit binding. | Exact conversion, authority, bounds, compatibility and conditions. |
| 4 (ui verified) | `INTEGRATION-RATIONAL-ADOPTION1` | Independent New Integration workspace with exact source lowering, retained exclusions, worker-only execution, drafts and fresh replay. | Formal output, conditions, copy/artifacts, cancellation/staleness, authority ratchets and npm-dev Playwright. |
| 4 presentation follow-up (ui verified) | `INTEGRATION-RATIONAL-PRESENTATION1` | Canonical-derived structural formatting, compact/full formulas, exact copy, condition provenance and per-tab preference. | UI: exact identity/fallback tests, proof/artifact invariance, lifecycle isolation and npm-dev Playwright. |
| 5 (backend verified; not adopted) | `INTEGRATION-DIFFERENTIAL-FIELD1` | Q and Q(x); recursive formal towers, dual-number derivative verification, certified first-level rational-multiple exponentials/local logarithms, exact admission evidence and fresh replay. | 138 retained tests plus 40 new tests; honest formal constants, ownership/derivative laws, pole/residue obstructions, mutation/budget/codec checks. Parameters, algebraic constants, broader admission and input conversion are deferred. |
| 6 prerequisite (backend verified; not adopted) | `INTEGRATION-RATIONAL-RDE1` | Owned Q(x); exact finite-pole resonances, certified positive-integer roots, infinity bounds, complete linear systems and version-1 replay. | 178 retained plus 62 new core tests; complete rational solution spaces or no-rational-solution evidence, mutation/resource checks. No general elementary decision. |
| 6 first decision slice (backend verified; not adopted) | `INTEGRATION-HYPEREXPONENTIAL-DECISION1` | Single b exp(r), rational b/r and nonconstant r; certified exp admission, complete rational RDE, checked Liouville reduction, positive/negative replay. | 240 retained + 66 new core tests, original-exponent binding, exact derivative/negative witnesses, unchanged codecs and shared-budget stops. Finite sums are handled by the following separately reviewed expansion. |
| 6 arithmetic follow-up (backend verified) | `INTEGRATION-DIFFERENTIAL-ARITHMETIC-PERFORMANCE1` | Owned recursive validation and checked monomial fraction normalization, alignment and cancellation; preserve independent verification and saved formats. | 6.95x complete inverse-exponential integration / 6.03x fresh verification, all 94 corpus operations within acceptance, 306 retained + 17 new core tests; existing rational app output visually checked. |
| 6 finite-sum expansion (backend verified; not adopted) | `INTEGRATION-EXPONENTIAL-SUM-DECISION1` | Exact rational-multiple arguments, cancellation before admission, one certified generator, complete RDE components, explicit rational-owner bridge and combined root-log/exponential evidence. | 323 retained + 63 new tests; complete coverage, early negative obstruction, producer-disabled replay, conditions and shared-budget failures. [Specification](integration-exponential-sum-decision1-spec.md). |
| 6 | `INTEGRATION-TRANSCENDENTAL-DECISION1` | Validated towers and required lower-field algorithms; recursive RDE bounds, limited integration, logarithmic derivatives and Liouville reductions. | Backend and UI on adoption: checked positive/negative certificates with explicit domain hypotheses. |
| 6 full one-generator expansion | `INTEGRATION-EXPONENTIAL-RATIONAL-REPRESENTATION1` then `INTEGRATION-EXPONENTIAL-RATIONAL-DECISION1` | Owned certified Q(x)(t), exact F-valued root-log traces, normal/special Hermite reduction, constant-residue decision, complete Laurent/RDE reduction and full replay. | Both backend gates verified: 386 retained + 24 representation + 60 decision tests. [Representation](integration-exponential-rational-representation1-spec.md); [decision and proof](integration-exponential-rational-decision1-spec.md). UI/result authority and broader fields remain separate. |
| 6 nested arithmetic follow-up (backend verified) | `INTEGRATION-NESTED-ARITHMETIC-PERFORMANCE1` | Checked normalized-coprimality evidence, owned fraction adapters and denominator-cleared primitive Euclid; preserve native arithmetic and existing proof/artifact contracts. | 10.25x complete shifted integration / 10.99x fresh verification; quadratic/inverse stress construction and replay complete; all 149 non-target comparisons pass; 481 core + 40 affected adoption tests covered. [Specification](integration-nested-arithmetic-performance1-spec.md). |
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

- Adopted rational results now use the current schema-7 all-roots local-complex contract and source-exclusion lowering. Wider transcendental results, algebraic display rewrites and real forms still require their own representation/adoption decisions.
- After Stage 5: broader simultaneous/mixed/nested admission, effective constant extensions and parameter domains; higher-field/parameterized RDE, limited-integration and logarithmic-derivative obligations. Rational-coefficient RDEs are now covered by [RATIONAL-RDE1](integration-rational-rde1-spec.md). The [single-product hyperexponential gate](integration-hyperexponential-decision1-spec.md) now verifies its Liouville reduction and constant-descent hypotheses. The [differential arithmetic performance gate](integration-differential-arithmetic-performance1-spec.md) now exceeds both inverse-generator 5x targets while retaining exact checks. Finite sums have completed those ownership, coverage and replay prerequisites. Full one-generator rational expressions are now covered by the two verified backend gates; their dossiers define the exact scope and resource limitations. Any exponential UI adoption first needs a reviewed result contract for exponential-field primitives and negative authority, plus exact input lowering and retained exclusions. The nested arithmetic performance follow-up now exceeds its targets and resolves the selected coefficient-growth exhaustion cases; review the exponential result contract next, followed by exact input lowering and New Integration adoption. The completed first-level sufficient certificates are not a general dependency algorithm. Review these prerequisites before committing to the scope of Stage 6.
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

2026-09-29 closeout update: Claude commit `f1abd519` resolves the authority/display blockers; both checks pass. The missing New Integration worker-required runtime probe is implemented and passes. Final signoff is pending the Calculate V2 return-type compile error in that commit; see the dated dossier continuation. No integration commit or push.

Final closeout (2026-09-29): all adoption blockers above are resolved; both gates complete with user-authorized commit and no push. Next roadmap design is differential fields; a bounded rational presentation/resource-profile follow-up may precede it based on real usage. No new implementation scope is authorized by this note.
