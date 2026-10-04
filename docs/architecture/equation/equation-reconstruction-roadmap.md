# Equation Reconstruction Roadmap

Date: 2026-10-04
Status: provisional direction approved with the design gate. `EQUATION-RECONSTRUCTION-DESIGN1`, `EQUATION-EXACT-ALGEBRA1`, `EQUATION-ALGEBRAIC-NUMBERS1`, `EQUATION-REPRESENTATION1`, `EQUATION-POLYNOMIAL-DECISION1`, `EQUATION-GENERATORS1`, `EQUATION-CONSTRAINTS1`, `EQUATION-PERIODIC1`, `EQUATION-COMPOSITION1`, `EQUATION-PARAMETERS1` and `EQUATION-SYSTEMS1` are complete. Each later gate needs its own approval, and gates may be split, merged or reordered when evidence requires; the reason must be recorded.

Companion: [design](equation-reconstruction-design.md), [blueprint](equation-reconstruction-blueprint.md), [inventory and baseline](equation-reconstruction-inventory.md).

## Immediate next task

`EQUATION-SYSTEMS1` (stage 11, slice 6) is backend-verified in one PR with two commits (see its [specification](equation-systems1-spec.md)).

Part A:
- linear systems, with parameters as case trees;
- answers as points, parametric sets in the free targets, or ∅;
- a Bareiss completeness check in the verifier.

Part B:
- Gröbner bases with cofactor certificates;
- exact points of zero-dimensional systems: Hermite count and signature, a separating element, the rational univariate representation and certified coordinate matching;
- triangular infinite sets through the parameters gate;
- kernels by elimination down to slices 1–5.

This completes stage 11. The next gate is `EQUATION-PROOF-PERFORMANCE1`. It needs its own approval.

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
| 10 (backend verified) | `EQUATION-PARAMETERS1` | Case trees over ℚ(p…) | Quadratic with a = 0 cases; x⁵ + ax + 1 as parametric RootOf |
| 11 (backend verified) | `EQUATION-SYSTEMS1` (slice 6) | Multivariate polynomials, resultants, Gröbner bases, FGLM, RUR, triangular decomposition | Zero- and positive-dimensional systems with exact output |
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

## Deferred follow-ups (all gates)

The user asked for one ledger of everything the gates deferred (2026-10-04, `EQUATION-PARAMETERS1`). Each item names where it came from and the gate that owns it, or "unassigned". Later gates append to this table and strike items they close. None of these is a cap: each is refused honestly today, naming its owner.

| Item | From | Owner |
| --- | --- | --- |
| Non-real points ordered by canonical identity, not numerically (display order) | `EQUATION-POLYNOMIAL-DECISION1` | `EQUATION-RESULT-CONTRACT1` |
| Radical presentation: √D unsimplified (½·√8), √12 rather than 2√3, −(1 − e) not distributed, asin/atan residues not normalized | slices 1, 2 and 4 | `EQUATION-RESULT-CONTRACT1` (printer) |
| Two different closed forms of one value ordered only by refinement under the budget (the gate-6 caveat) | `EQUATION-GENERATORS1`, `EQUATION-PERIODIC1` | unassigned |
| Wider Lambert W simplification (several log bases) and algebraic bases with non-binomial minimal polynomials in the exponent lattice | `EQUATION-GENERATORS1` | unassigned |
| Dependent radicals (norm identically zero, e.g. √(x²+2x+1)) | `EQUATION-CONSTRAINTS1` | unassigned |
| Complex modulus and complex radicals (`unsupported` by decision) | `EQUATION-CONSTRAINTS1` | unassigned (see "Decisions remaining") |
| Transcendental constants inside a radical tower (√x + √(x+1) = ln 2) | `EQUATION-CONSTRAINTS1` | `EQUATION-CERTIFIED-NUMERICS1` |
| Radical forms beyond quadratic and pure binomial roots (S4 stays a RootOf) | `EQUATION-CONSTRAINTS1` | `EQUATION-RESULT-CONTRACT1` |
| Families in several integer parameters under further conditions | `EQUATION-PERIODIC1` | unassigned |
| The complement of an infinite family over ℂ (needs a set kind) | `EQUATION-PERIODIC1` (part B) | `EQUATION-RESULT-CONTRACT1` |
| Complex intersections and exclusions with non-affine families; nested families whose level is quadratic in its parameter | `EQUATION-PERIODIC1`, `EQUATION-COMPOSITION1` | unassigned |
| Interval families need one common trig argument with a peelable inverse | `EQUATION-COMPOSITION1` | unassigned |
| Non-closed-form boundaries and isolated numeric roots (eˣ + sin x > 0) | `EQUATION-COMPOSITION1` | `EQUATION-CERTIFIED-NUMERICS1` |
| Depth-25 periodic chains cost about 100 s with verification | `EQUATION-COMPOSITION1` | `EQUATION-PROOF-PERFORMANCE1` |
| Recursive walks of nested solution sets (normalization, keys, wire). The parameters gate builds flat case trees (one level), so the walks stay shallow; nested case trees would need explicit stacks | `EQUATION-REPRESENTATION1` | the gate that first nests case trees |
| Conjunctions of several relations in the target with several parameters; real roots of degree ≥ 3 with several parameters; deciding whether a several-parameter case is empty | `EQUATION-PARAMETERS1` | `EQUATION-SEMIALGEBRAIC1` |
| Excluding the roots of a parametric polynomial of degree ≥ 3 over ℂ | `EQUATION-PARAMETERS1` | unassigned |
| Mixed kernels with parameters (eˣ + a·sin x, eˣ + a·x, √x + √(x+a)) | `EQUATION-PARAMETERS1` | unassigned |
| Kernel levels of degree ≥ 2 in the kernel with parameters (e^{2x} + a·eˣ = 1), nested kernels, non-affine kernel arguments, the target in an exponent, tan/arcs/Lambert W with parameters, non-unit rational powers | `EQUATION-PARAMETERS1` | unassigned |
| sin/cos inequalities with parameters (parametric arcs per period) | `EQUATION-PARAMETERS1` | unassigned |
| Kernels with parameters over ℂ (e^{az} = b as (ln b + 2πik)/a) | `EQUATION-PARAMETERS1` | unassigned |
| A RootOf expression node, so roots with transcendental coefficients can sit inside kernels (e^{3x} + π·eˣ = e; ln(x³ + x) = 1 at degree 3) | `EQUATION-PARAMETERS1` | unassigned |
| Transcendental constants together with parameters (π·x = a); several relations or ≠ with transcendental constants over ℂ | `EQUATION-PARAMETERS1` | unassigned |
| Choosing the target automatically (prefer x, then other conventions); today the caller names it | `EQUATION-PARAMETERS1` (user question) | unassigned, after the roadmap |
| Complex or algebraic coefficients in systems (the polynomial atoms read rational coefficients) | `EQUATION-SYSTEMS1` | unassigned |
| Nonlinear systems with parameters (comprehensive Gröbner systems) | `EQUATION-SYSTEMS1` | unassigned |
| Kernels with parameters or extra conditions in a system; elimination that leaves several targets or interval answers | `EQUATION-SYSTEMS1` | unassigned |
| Positive-dimensional systems that are not triangular, or whose dependent target needs a root of degree ≥ 3 (regular-chain triangular decomposition) | `EQUATION-SYSTEMS1` | unassigned |
| Systems with no exactly isolable target among kernels (eˣ + sin y = 1, eʸ + sin x = 1) | `EQUATION-SYSTEMS1` | `EQUATION-CERTIFIED-NUMERICS1` |

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
