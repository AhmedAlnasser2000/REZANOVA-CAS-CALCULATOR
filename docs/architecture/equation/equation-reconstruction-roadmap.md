# Equation Reconstruction Roadmap

Date: 2026-10-04
Status: provisional direction approved with the design gate. `EQUATION-RECONSTRUCTION-DESIGN1`, `EQUATION-EXACT-ALGEBRA1`, `EQUATION-ALGEBRAIC-NUMBERS1`, `EQUATION-REPRESENTATION1`, `EQUATION-POLYNOMIAL-DECISION1`, `EQUATION-GENERATORS1`, `EQUATION-CONSTRAINTS1`, `EQUATION-PERIODIC1`, `EQUATION-COMPOSITION1`, `EQUATION-PARAMETERS1`, `EQUATION-SYSTEMS1`, `EQUATION-PROOF-PERFORMANCE1`, `EQUATION-RESULT-CONTRACT1`, `EQUATION-PRESENTATION1` and `EQUATION-ADOPTION1` are complete. Each later gate needs its own approval, and gates may be split, merged or reordered when evidence requires; the reason must be recorded.

Companion: [design](equation-reconstruction-design.md), [blueprint](equation-reconstruction-blueprint.md), [inventory and baseline](equation-reconstruction-inventory.md).

## Immediate next task

`EQUATION-ADOPTION1` (stage 14) is verified in one PR with two commits (see its [specification](equation-adoption1-spec.md)).

Part A:
- rows read as relations, with automatic unknowns;
- assumptions applied exactly with independent evidence, and recorded in V6 (an optional `assumptions` field);
- the New Equation worker service, OOE runtime shell and Rust descriptors;
- drafts per tab.

Part B:
- the New Equation page (rows, Enter / Shift+Enter, Solve for chips, Real | Complex, Exact | Decimal | Both, the verified line, conditions used, copy, the outdated state, Stop, limits);
- the menu entry and tabs;
- the Guide article;
- Playwright evidence on the real app.

This completes stage 14.

Now: stage 15 `EQUATION-CERTIFIED-NUMERICS1`, renumbered from 16 (see the order change below the stage table; [specification](equation-certified-numerics1-spec.md)). PR A (one variable) is verified: certified isolated real roots as a new schema-7 root binder `isolated-real-root`, range rows, an independent exclusion verifier and the "Certified" line. PR B covers square systems by Krawczyk and is planned when PR A merges. Stage 16 `EQUATION-SEMIALGEBRAIC1` follows with its own approval.

Before the roadmap resumes, one PR (2026-10-07) carries [`TESTS-LEGACY-EQUATION-INERT1`](tests-legacy-equation-inert1.md) and [`NEW-EQUATION-RESPONSIVE1`](new-equation-responsive1.md):
- rows read off the main thread;
- the answer shown before it is checked;
- finite systems verified in one number field;
- the development-only 60-second slow-case probe.

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
| 12 (backend verified) | `EQUATION-PROOF-PERFORMANCE1` | Fast replay verification; measured hot paths | Recorded medians; no correctness regression |
| 13 (verified) | `EQUATION-RESULT-CONTRACT1` | Canonical-result V6 for solution sets and outcomes | Authority, bounds, conversions, compatibility |
| 13b (verified) | `EQUATION-PRESENTATION1` | Display normalization of V6 answers (radical simplification, numeric order of complex roots, distribution, residue normalization), as integration's contract → presentation → adoption | Presentation tests on the corpus; no change to canonical V6 |
| 14 (verified) | `EQUATION-ADOPTION1` (ui) | New Equation workspace, worker host, capability ID, OOE shell, drafts and replay | Playwright evidence on answers, conditions, statuses and overflow |
| 15 (PR A verified; PR B next) | `EQUATION-CERTIFIED-NUMERICS1` (slice 8) | Interval Newton and Krawczyk on bounded intervals, exclusion proofs. PR A: one variable (isolated real roots, range rows). PR B: square systems | N cases certified; numerical results typed as numerical |
| 16 | `EQUATION-SEMIALGEBRAIC1` (slice 7) | CAD for real systems with inequalities | Feasibility and decision cases |
| 17 | `EQUATION-RECONSTRUCTION-CLOSEOUT1` | Corpus parity, then retirement of the old Equation engine | Capability ledger; no regression versus the baseline table |

**Order change (user decision, 2026-10-07):** certified numerics now comes before the semialgebraic gate, and the stage numbers were swapped (15 ↔ 16); the gate names and slice numbers are unchanged. Numerics serves common single equations that end in "Not solved yet" today (cos x = x, eˣ + x³ = 5), while CAD mostly serves inequality systems and several-parameter problems; neither blocks the other.

Stages 15 and 16 may move before adoption if the user wants them in the first product release. Adoption can also happen earlier with fewer slices, because V6 is designed to grow by kinds.

## After this roadmap: certified-numerics expansion (user decision, 2026-10-07)

This roadmap rebuilds Equation and retires the old engine. Certified numerics keeps only what PR B needs; the rest waits for the expansion roadmap that follows.

**In PR B (stage 15)**: the Krawczyk uniqueness test; a floating-point Newton guess inflated into a box and proven once exactly (ε-inflation; the floats only guess); HC4 contraction (shrinking boxes by the equations before splitting); mean-value ranges on small boxes.

**Later (expansion roadmap)**, roughly by value:
1. Speed substrate: dyadic ball arithmetic (midpoint and radius with outward rounding) instead of growing rational endpoints.
2. Fewer refusals: bounds proven automatically (fewer "add a range row"), Descartes/Rolle root counting for exponential sums, the Hansen–Sengupta contractor.
3. Numbers back to exact: PSLQ/LLL recognition of a closed form from certified digits, then an exact proof.
4. Hard cases, each needing a policy decision first: exp-log root isolation conditional on Schanuel's conjecture (tangent roots, over-determined systems), deflation and topological degree for multiple roots.
5. New answer kinds: certified curves (under-determined systems) and pavings (non-polynomial inequality systems).
6. Heavy tools when needed: Taylor models, homotopy continuation with certified path tracking.

## Migration and verification rules

- The old engine is untouched until stage 17. New Equation and old Equation coexist after adoption.
- No gate may introduce a shape cap. Exhaustion is a typed resource stop; every new algorithm declares its progress measure.
- Every positive answer carries a replayable certificate. Every negative answer (`EMPTY`) carries a proof, not a failed search.
- No partial-root results. Exact reduced forms only when they are proven equivalent.
- Tests use explicit small budgets to exercise stop paths and never assert that default budgets stop a large problem.
- Stress cases are measurable properties, such as "25 nested functions solved by the same code as 3", not aspirations.
- Follow AGENTS.md resource-safe verification. Focused core tests per gate; full suites only at closeout.

## Decisions remaining before later gates

- The exact interface of the future OOE resource subsystem that replaces the core's budgets.
- When, if ever, to extract a shared exact-arithmetic layer with the integration core.
- Whether complex modulus and complex radicals (`unsupported` since stage 7, by user decision) get a gate of their own.

## Deferred follow-ups (all gates)

The user asked for one ledger of everything the gates deferred (2026-10-04, `EQUATION-PARAMETERS1`). Each item names where it came from and the gate that owns it, or "unassigned". Later gates append to this table and strike items they close. None of these is a cap: each is refused honestly today, naming its owner.

| Item | From | Owner |
| --- | --- | --- |
| ~~Non-real points ordered by canonical identity, not numerically (display order)~~ (closed by `EQUATION-PRESENTATION1`) | `EQUATION-POLYNOMIAL-DECISION1` | `EQUATION-PRESENTATION1` |
| ~~Radical presentation: √D unsimplified (½·√8), √12 rather than 2√3, −(1 − e) not distributed, asin/atan residues not normalized~~ (closed by `EQUATION-PRESENTATION1`) | slices 1, 2 and 4 | `EQUATION-PRESENTATION1` |
| Two different closed forms of one value ordered only by refinement under the budget (the gate-6 caveat) | `EQUATION-GENERATORS1`, `EQUATION-PERIODIC1` | unassigned |
| Wider Lambert W simplification (several log bases) and algebraic bases with non-binomial minimal polynomials in the exponent lattice | `EQUATION-GENERATORS1` | unassigned |
| Dependent radicals (norm identically zero, e.g. √(x²+2x+1)) | `EQUATION-CONSTRAINTS1` | unassigned |
| Complex modulus and complex radicals (`unsupported` by decision) | `EQUATION-CONSTRAINTS1` | unassigned (see "Decisions remaining") |
| ~~Transcendental constants inside a radical tower (√x + √(x+1) = ln 2)~~ (closed by `EQUATION-CERTIFIED-NUMERICS1` PR A: √x + √(x+1) = ln 5 gives a certified root) | `EQUATION-CONSTRAINTS1` | `EQUATION-CERTIFIED-NUMERICS1` |
| ~~Radical forms beyond quadratic and pure binomial roots (S4 stays a RootOf)~~ (closed by `EQUATION-PRESENTATION1`) | `EQUATION-CONSTRAINTS1` | `EQUATION-PRESENTATION1` |
| Families in several integer parameters under further conditions | `EQUATION-PERIODIC1` | unassigned |
| The complement of an infinite family over ℂ (needs a set kind; not in V6's first version, user decision 2026-10-04) | `EQUATION-PERIODIC1` (part B) | a later V6 kind, with the slice that produces it |
| Complex intersections and exclusions with non-affine families; nested families whose level is quadratic in its parameter | `EQUATION-PERIODIC1`, `EQUATION-COMPOSITION1` | unassigned |
| Interval families need one common trig argument with a peelable inverse | `EQUATION-COMPOSITION1` | unassigned |
| ~~Non-closed-form boundaries and isolated numeric roots (eˣ + sin x > 0)~~ (closed by `EQUATION-CERTIFIED-NUMERICS1` PR A, with a range row when there are infinitely many) | `EQUATION-COMPOSITION1` | `EQUATION-CERTIFIED-NUMERICS1` |
| ~~Depth-25 periodic chains cost about 100 s with verification~~ (closed: about 0.6 s, `EQUATION-PROOF-PERFORMANCE1` part A) | `EQUATION-COMPOSITION1` | `EQUATION-PROOF-PERFORMANCE1` |
| Recursive walks of nested solution sets (normalization, keys, wire). The parameters gate builds flat case trees (one level), so the walks stay shallow; nested case trees would need explicit stacks | `EQUATION-REPRESENTATION1` | the gate that first nests case trees |
| Conjunctions of several relations in the target with several parameters; real roots of degree ≥ 3 with several parameters; deciding whether a several-parameter case is empty | `EQUATION-PARAMETERS1` | `EQUATION-SEMIALGEBRAIC1` |
| Excluding the roots of a parametric polynomial of degree ≥ 3 over ℂ | `EQUATION-PARAMETERS1` | unassigned |
| Mixed kernels with parameters (eˣ + a·sin x, eˣ + a·x, √x + √(x+a)) | `EQUATION-PARAMETERS1` | unassigned |
| Kernel levels of degree ≥ 2 in the kernel with parameters (e^{2x} + a·eˣ = 1), nested kernels, non-affine kernel arguments, the target in an exponent, tan/arcs/Lambert W with parameters, non-unit rational powers | `EQUATION-PARAMETERS1` | unassigned |
| sin/cos inequalities with parameters (parametric arcs per period) | `EQUATION-PARAMETERS1` | unassigned |
| Kernels with parameters over ℂ (e^{az} = b as (ln b + 2πik)/a) | `EQUATION-PARAMETERS1` | unassigned |
| A RootOf expression node, so roots with transcendental coefficients can sit inside kernels (e^{3x} + π·eˣ = e; ln(x³ + x) = 1 at degree 3) | `EQUATION-PARAMETERS1` | unassigned |
| Transcendental constants together with parameters (π·x = a); several relations or ≠ with transcendental constants over ℂ | `EQUATION-PARAMETERS1` | unassigned |
| ~~Choosing the target automatically (prefer x, then other conventions); today the caller names it~~ (closed by `EQUATION-ADOPTION1`: x, y, z, t, then alphabetical, editable) | `EQUATION-PARAMETERS1` (user question) | `EQUATION-ADOPTION1` |
| Complex or algebraic coefficients in systems (the polynomial atoms read rational coefficients) | `EQUATION-SYSTEMS1` | unassigned |
| Nonlinear systems with parameters (comprehensive Gröbner systems) | `EQUATION-SYSTEMS1` | unassigned |
| Kernels with parameters or extra conditions in a system; elimination that leaves several targets or interval answers | `EQUATION-SYSTEMS1` | unassigned |
| Positive-dimensional systems that are not triangular, or whose dependent target needs a root of degree ≥ 3 (regular-chain triangular decomposition) | `EQUATION-SYSTEMS1` | unassigned |
| Systems with no exactly isolable target among kernels (eˣ + sin y = 1, eʸ + sin x = 1) | `EQUATION-SYSTEMS1` | `EQUATION-CERTIFIED-NUMERICS1` PR B (square systems, Krawczyk) |
| Evidence cases still over 1 s to decide and verify (atan x + atan 2x = π/4 at 1.8 s; the depth-25 ln chain at 1.1 s); the user accepted them for now (2026-10-04) | `EQUATION-PROOF-PERFORMANCE1` | a later performance gate |
| Radical simplification inside expressions with free symbols (√(−4(y² − 1)) is not shown as 2√(1 − y²)); rewrites are proven only on constant subexpressions | `EQUATION-PRESENTATION1` | unassigned |
| Closed forms for pure binomial roots inside larger values (e^{r₁} with r₁ = ∛4 shows r₁ and its definition) | `EQUATION-PRESENTATION1` | unassigned |
| The detailed verification report (one entry per check behind "Verified exactly") | `EQUATION-ADOPTION1` (user decision) | `EQUATION-VERIFICATION-REPORT1` |
| Global History for New Equation; export, open and verify of saved problems | `EQUATION-ADOPTION1` (user decision) | unassigned |
| Step-by-step explanations, by an agent through MCP in Notebook | `EQUATION-ADOPTION1` (user decision) | unassigned |
| Assumptions coupling several parameters beyond monomials (cases kept as they are, with a note) | `EQUATION-ADOPTION1` | `EQUATION-SEMIALGEBRAIC1` |
| Nested absolute values (\|x − \|x − 1\|\| = 1) stop with an internal "division-by-zero: rational inverse" error instead of an answer | user test cases, 2026-10-05 | unassigned (constraints slice) |
| Complex radicals shown as √(−3) and √(−16) instead of √3·i and 4i in roots of quadratics over ℂ | user test cases, 2026-10-05 | unassigned (presentation) |
| Parametric system values laid out as −(z − 1)/2 and −(−1 − a)/2 instead of (1 − z)/2 and (a + 1)/2 | user test cases, 2026-10-05 | unassigned (presentation) |
| ~~Finite system points checked by substituting separate algebraic coordinates (composed resultants: x³y² + x = 4y, x + y = 7 − x² took 11 s over ℝ and 66 s over ℂ to verify, then over a minute to lay out over ℂ)~~ (closed by `NEW-EQUATION-RESPONSIVE1`) | user test cases, 2026-10-07 | `NEW-EQUATION-RESPONSIVE1` |
| Points whose coordinates are not exact algebraic numbers (closed forms with transcendental parts) still verify by exact substitution, which can be slow for high degrees | `NEW-EQUATION-RESPONSIVE1` | unassigned (systems) |
| Non-real decimals and order fall back to exact real and imaginary parts (slow for high degrees) on a rounding tie, a real part that may be zero, or equal real parts of different numbers | `NEW-EQUATION-RESPONSIVE1` | unassigned (presentation) |
| Positive-dimensional and parametric systems still verify by re-deriving at samples; their timing was not measured in this gate | `NEW-EQUATION-RESPONSIVE1` | unassigned (systems) |
| MathLive keeps a phantom open fence after an unbalanced `\left(` is set programmatically: every later `setValue` (even `''`) ends in `\left(\right.`. Typing is unaffected (typing `(` inserts a balanced pair); select-all and delete clears it. Reproduced on a bare `math-field` outside the app | post-merge Playwright check, 2026-10-07 | unassigned (shared editor) |
| Case conditions are not simplified: x²yc + x³ = axy shows "If ax − cx² = 0 and x³ = 0" where x = 0 says the same, and ax − cx² is not shown factored as x(a − cx) | user test case, 2026-10-07 | unassigned (presentation) |
| "Some cases could not be checked against the assumptions" appears whenever case conditions couple several parameters, even when every kept case is in fact possible under the assumptions (x²yc + x³ = axy with a ≠ 0, a < 0 or a > 0). The answer is correct; the pruning just cannot decide coupled conditions yet | user test case, 2026-10-07 | `EQUATION-SEMIALGEBRAIC1` |
| ~~A stray vertical scrollbar beside tall answer rows (fractions), from `overflow-x: auto` on the math row~~ (fixed 2026-10-07, `overflow-y: hidden`) | user test case, 2026-10-07 | `NEW-EQUATION-RESPONSIVE1` follow-up |
| Over-determined non-polynomial systems (an extra equation cannot be certified exactly zero at a numeric point) | `EQUATION-CERTIFIED-NUMERICS1` (plan) | unassigned |
| Under-determined non-polynomial systems (the answer is a curve; needs a representation gate) | `EQUATION-CERTIFIED-NUMERICS1` (plan) | unassigned |
| Tangent or double non-polynomial roots (no sign change, so uniqueness cannot be proven; one variable and systems) | `EQUATION-CERTIFIED-NUMERICS1` | unassigned |
| Non-polynomial systems with inequalities | `EQUATION-CERTIFIED-NUMERICS1` (plan) | beside `EQUATION-SEMIALGEBRAIC1` |
| tan inside mixed expressions (tan x = x) is still refused: the finder does not cut at the poles of tan | `EQUATION-CERTIFIED-NUMERICS1` PR A | unassigned |
| Definition rows show the normalized expression (10 − e^{x ln 3} − e^{x ln 2} = 0 for 2ˣ + 3ˣ = 10) rather than the typed one | `EQUATION-CERTIFIED-NUMERICS1` PR A | unassigned (presentation) |
| Numeric roots over ℂ (complex isolation of non-polynomial expressions) stay refused | `EQUATION-CERTIFIED-NUMERICS1` PR A | unassigned |
| The independent completeness cover applies to one equation plus constant range rows; inequalities and other shapes rely on each root's certificate plus re-derivation | `EQUATION-CERTIFIED-NUMERICS1` PR A | unassigned |
| An exact root where f′ = 0 (a closed-form double root next to numeric roots) skips the cover | `EQUATION-CERTIFIED-NUMERICS1` PR A | unassigned |

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
