# EQUATION-FRONTIER-HANDOFF-RESYNC0

Date: 2026-06-21

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: claude
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: mixed

## Scope

- Docs/memory resync only.
- Re-read the external handoff at `/home/ahmed/Downloads/codex-handoff-solver-phase.md` against the live repo state after search discipline, substrate seams, Exact/Isolate simplification, and Numeric Interval repair.
- No production code, tests, cap constants, solver behavior, UI, OOE, Display, History, app-state, Tauri, graphing, step-by-step, Rust migration, source-mirror behavior, or answer-mode behavior changed.

## Question

The earlier handoff asked Calcwiz to fix solver strategy search first, then caps, then algorithms. That was the right high-level order, but the repo has now completed much of the search/substrate preparation. This resync asks:

- What is already implemented?
- What remains valuable?
- What is stale, wrong, or too broad for Calcwiz?
- What should become the first real frontier implementation?

## Original Handoff Items Resynced

| Handoff item | Current status | Frontier interpretation |
| --- | --- | --- |
| Expression-structure-first classifier | Implemented in Calcwiz-native form through `target-shape` profiling, route planning, and generated-handoff trace evidence. Not implemented in `semantic-planner.ts`, and that correction is intentional. | Preserve the discipline; do not reopen as a broad planner rewrite. Future families should consume the existing profile/route/trace seams. |
| Lazy structural verification | Implemented through route-gated selected-target and generated-branch attempts. | Keep using route evidence and cheap family rejection before expensive solving. |
| Memoized traversal / DAG wording | Current work has local memoized traversal, not a symbolic DAG/e-graph. | DAG/search graph remains deferred until repeated transformation-state pressure appears. |
| Flat polynomial representation | Corrected: Algebra already has exact polynomial/rational cores; Equation now has a MathJSON-symbolic coefficient seam. | Do not rebuild representation from scratch. Frontier work should bridge existing cores into visible Equation capability where safe. |
| Cap recalibration | Audited with cap evidence and real/default cases. No cap raise justified yet. | Treat most caps as algorithm/readback/semantic boundaries. Raise only after capability/readback work changes the boundary. |
| Cardano/Ferrari | Not implemented as broad symbolic formulas. | Do not jump straight to giant formulas. First prefer factor/special-form expansion and a cubic/quartic policy audit. |
| Degree 5+ special forms | Mostly not implemented in Equation frontier form. | Valuable after factorable decomposition and root representation adoption are stable. |
| Durand-Kerner numeric fallback | Numeric polynomial roots exist in Algebra contexts, and Numeric Interval Solve is repaired as contextual numeric support. | Keep numeric output labeled numeric; do not use numeric fallback as Exact closure. |
| Factoring pipeline | Partial Algebra factorization and Equation product decomposition exist, but not broad Equation adoption. | This is the best first frontier implementation lane. |
| Named simplification operations | Existing Algebra transform/simplify policy exists, but broad simplification is not the immediate Equation frontier. | Defer unless a specific solver family needs a named transform seam. |
| Step-by-step | Still deferred. | Correct: step-by-step should explain mature solver paths, not drive the frontier. |
| Graphing | Still deferred. | Correct: graphing should consume validated domains, branches, restrictions, discontinuities, and failure reasons. |
| Rust boundary | Still conservative. | Correct: no expression trees through IPC; only measured flat-data loops later. |

## What The Handoff Got Right

- Search discipline before algorithms was the correct order.
- The "s" reference family correctly exposed that expensive wrong-family search can make a solvable case feel blocked.
- The mature-system lesson is valid: shape indexing, coefficient representations, domain facts, factoring, elimination, and honest fallback matter more than trying every family.
- Step-by-step and graphing should wait until solver behavior is mature enough to defend.
- Rust should remain measured and data-shape-specific.

## What Is Now Stale Or Corrected

- `semantic-planner.ts` is not the selected-target strategy router; the live selected-target and parameterized routing is under `src/lib/modes/equation/parameterized.ts` and `src/lib/equation/**`.
- The dispatcher/search layer is no longer the first unfinished layer. It has enough rails for capability work.
- "Build flat polynomial representation" is too broad/stale. Existing Algebra polynomial and rational-function cores are live; Equation needed, and now has, a symbolic coefficient seam.
- Cap tables from the handoff are not implementation instructions. Current cap evidence says degree, formula-size, composition-depth, and periodic-parameter boundaries are not simple knobs.
- Cardano/Ferrari should not be the next automatic leap. They need readback/product policy first because exact-but-huge formulas should not be silently reclassified or dumped.
- Durand-Kerner may be useful as numeric support, but it must not blur Exact/Isolate semantics.
- "Full symbolic differentiation is easy, always terminates" remains too optimistic for Calcwiz product work because simplification, display size, domains, vector calculus, and higher-order growth still need caps and readback discipline.

## What We Have Now That The Handoff Did Not Assume

- Search-discipline closeout: profile, route plan, traces, generated handoff, symbolic coefficient seam, generated branch handoff, shared MathJSON arithmetic.
- Substrate seams: explicit product decomposition, internal root representation, branch/domain facts, compact root readback.
- Answer semantics: active Equation modes are Exact and Isolate; Approx is no longer a persisted/user-facing answer mode.
- Numeric support: Numeric Interval Solve is contextual, guided, adaptively refined, and visibly approximate.
- Source-mirror context: local audits confirm mature systems get breadth from substrate and honest fallback, not unbounded peeling.

## Recommended Frontier Start

The first implementation should be:

`EQUATION-FACTORABLE-DECOMPOSITION-FRONTIER1`

Reason:

- It uses the substrate Calcwiz just built.
- It can produce visible exact capability improvement without inventing a new solver authority.
- It directly addresses a known cap family: factorable/product degree boundaries.
- It avoids the highest-risk jump to general Cardano/Ferrari formulas.
- It prepares later expanded factorization, special forms, and implicit-root work.

## Deferred But Preserved

- DAG/e-graph/search graph: preserve as a later optimization/search representation after repeated transformation states become concrete.
- Cardano/Ferrari: preserve as future policy-backed capability, not first frontier code.
- Degree 5+ special forms: preserve as a strong later frontier lane after factorable decomposition.
- Resultants/elimination: preserve as a later bounded lane using existing Algebra polynomial-elimination cores.
- Durand-Kerner: preserve as numeric support only, not Exact closure.
- Integration/ODE/PDE/linear algebra expansion: preserve outside this Equation frontier kickoff.

## New Frontier Rule

The frontier should not ask "what giant feature can we copy next?" It should ask:

1. What exact object can Calcwiz represent now?
2. What transformation can Calcwiz perform safely on that object?
3. What facts/branches/exclusions does the transformation create?
4. Can the current readback surface show it honestly?
5. If not, should the result stay structured/internal until readback policy exists?

Only after those answers are clear should a new family become visible.

## Verification

- Read the external handoff.
- Read current search/substrate roadmaps.
- Read source-mirror and cap evidence audits.
- Confirmed no production source changes were required.
- Durable verification is recorded in the session dossier.
