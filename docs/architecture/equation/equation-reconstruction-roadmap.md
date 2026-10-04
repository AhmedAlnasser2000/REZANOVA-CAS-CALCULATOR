# Equation Reconstruction Roadmap

Date: 2026-10-04
Status: provisional direction approved with the design gate. `EQUATION-RECONSTRUCTION-DESIGN1`, `EQUATION-EXACT-ALGEBRA1`, `EQUATION-ALGEBRAIC-NUMBERS1`, `EQUATION-REPRESENTATION1`, `EQUATION-POLYNOMIAL-DECISION1`, `EQUATION-GENERATORS1`, `EQUATION-CONSTRAINTS1`, `EQUATION-PERIODIC1` and `EQUATION-COMPOSITION1` are complete. Each later gate needs its own approval, and gates may be split, merged or reordered when evidence requires; the reason must be recorded.

Companion: [design](equation-reconstruction-design.md), [blueprint](equation-reconstruction-blueprint.md), [inventory and baseline](equation-reconstruction-inventory.md).

## Immediate next task

`EQUATION-PARAMETERS1` (stage 10) is in progress in one PR with two commits (see its [specification](equation-parameters1-spec.md)). Part A is backend-verified:
- polynomial and rational relations with coefficients in ℚ(p…) are decided as case trees;
- one parameter gives exact cells with algebraic breakpoints and parametric roots;
- several parameters give sign-condition trees (degree ≤ 2 over ℝ, root sets over ℂ);
- a specialization verifier checks every case against slice 1;
- exact zero tests with algebraic coefficients now use Liouville's inequality.

Part B (parametric single kernels, transcendental constant coefficients, and the consolidated follow-up ledger) comes next in the same PR. `EQUATION-COMPOSITION1` (slice 5) is complete.

## Implementation sequence

| Stage | Milestone | Prerequisites and work | Exit evidence |
| --- | --- | --- | --- |
| 1 (complete) | `EQUATION-RECONSTRUCTION-DESIGN1` | Design, blueprint, inventory, baseline probe, roadmap, first specification | Docs and memory recorded; memory/file-size/diff checks |
| 2 (backend verified) | `EQUATION-EXACT-ALGEBRA1` | Execution context with typed stops; rationals; modular tools; dense univariate polynomials; modular GCD; Yun; subresultants; Bareiss; private wire; isolation and no-caps ratchets | Law and identity tests, adversarial sizes, tiny-budget stops, isolation |
| 3 (backend verified) | `EQUATION-ALGEBRAIC-NUMBERS1` | Factorization over ℚ (Cantor–Zassenhaus, Hensel, Zassenhaus); real and complex root isolation; RootOf arithmetic and sign; certificates | Product/isolation certificates, mutation rejection, high-degree cases (degree 20, 50, 100) |
| 4 (backend verified) | `EQUATION-REPRESENTATION1` | Expression graph, relation problem, transform records, solution-set algebra, replay codec, verifier | Hash-consing laws, replay of recorded chains, tampering rejection |
| 5 (backend verified) | `EQUATION-POLYNOMIAL-DECISION1` (slice 1) | Univariate polynomial and rational equations over ℝ and ℂ; exclusions; exact reduced forms; six outcomes | Corpus P/R cases exact, including degree ≥ 5 as RootOf; empty sets proven |
| 6 (backend verified) | `EQUATION-GENERATORS1` (slice 2) | Kernel collection, exponent lattice, basis choice, exp/log inverse relations, Lambert W; also nested exp/log chains (C6/C7) | Corpus E cases exact (ln 2, ln 3; W₀(1)); equivalent forms converge |
| 7 (backend verified) | `EQUATION-CONSTRAINTS1` (slice 3) | Sign intervals, lazy branch manager, absolute values and radical generators (same-base lattice, tower elimination), real only; range contractors moved to stage 9 | Corpus A/S/M cases exact, including the two old false negatives |
| 8 (backend verified) | `EQUATION-PERIODIC1` (slice 4) | Trig algebraization, periodic families, Diophantine intersection, interval restriction; complex exp/log families ln c + 2πik (moved from stage 6) | T cases exact; sin x = 0 on [0,100] as 32 exact roots kπ |
| 9 (backend verified) | `EQUATION-COMPOSITION1` (slice 5) | Range/injectivity reasoning over the graph at any depth; HC4 range contractors (moved from stage 7); inequalities with families not affine in their parameter, several complex logarithms and non-affine complex intersections (moved from stage 8) | Remaining C cases with exact constants (no decimals; C6/C7 done in stage 6); depth 3 and depth 25 by the same code |
| 10 (part A backend verified) | `EQUATION-PARAMETERS1` | Case trees over ℚ(p…) | Quadratic with a = 0 cases; x⁵ + ax + 1 as parametric RootOf |
| 11 | `EQUATION-SYSTEMS1` (slice 6) | Multivariate polynomials, resultants, Gröbner bases, FGLM, RUR, triangular decomposition | Zero- and positive-dimensional systems with exact output |
| 12 | `EQUATION-PROOF-PERFORMANCE1` | Fast replay verification; measured hot paths | Recorded medians; no correctness regression |
| 13 | `EQUATION-RESULT-CONTRACT1` | Canonical-result V6 for solution sets and outcomes | Authority, bounds, conversions, compatibility |
| 14 | `EQUATION-ADOPTION1` (ui) | New Equation workspace, worker host, capability ID, OOE shell, drafts and replay | Playwright evidence on answers, conditions, statuses and overflow |
| 15 | `EQUATION-SEMIALGEBRAIC1` (slice 7) | CAD for real systems with inequalities | Feasibility and decision cases |
| 16 | `EQUATION-CERTIFIED-NUMERICS1` (slice 8) | Interval Newton and Krawczyk on bounded intervals, exclusion proofs | N cases certified; numerical results typed as numerical |
| 17 | `EQUATION-RECONSTRUCTION-CLOSEOUT1` | Corpus parity, then retirement of the old Equation engine | Capability ledger; no regression versus the baseline table |

Stages 15 and 16 may move before adoption if the user wants them in the first product release. Adoption can also happen earlier with fewer slices, because V6 is designed to grow by kinds.

## Migration and verification rules

- The old engine is untouched until stage 17. New Equation and old Equation coexist after adoption.
- No gate may introduce a shape cap. Exhaustion is a typed resource stop; every new algorithm declares its progress measure.
- Every positive answer carries a replayable certificate. Every negative answer (`EMPTY`) carries a proof, not a failed search.
- No partial-root results. Exact reduced forms only when they are proven equivalent.
- Tests use explicit small budgets to exercise stop paths and never assert that default budgets stop a large problem.
- Stress cases are measurable properties, such as "25 nested functions solved by the same code as 3", not aspirations.
- Follow AGENTS.md resource-safe verification. Focused core tests per gate; full suites only at closeout.

## Decisions remaining before later gates

- V6 scope and whether adoption precedes stages 15–16.
- The exact interface of the future OOE resource subsystem that replaces the core's budgets.
- When, if ever, to extract a shared exact-arithmetic layer with the integration core.
- Whether complex modulus and complex radicals (`unsupported` since stage 7, by user decision) get a gate of their own.

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live
