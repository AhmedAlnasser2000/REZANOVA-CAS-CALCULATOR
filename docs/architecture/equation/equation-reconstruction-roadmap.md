# Equation Reconstruction Roadmap

Date: 2026-10-04
Status: provisional direction approved with the design gate. `EQUATION-RECONSTRUCTION-DESIGN1`, `EQUATION-EXACT-ALGEBRA1`, `EQUATION-ALGEBRAIC-NUMBERS1`, `EQUATION-REPRESENTATION1`, `EQUATION-POLYNOMIAL-DECISION1`, `EQUATION-GENERATORS1`, `EQUATION-CONSTRAINTS1`, `EQUATION-PERIODIC1`, `EQUATION-COMPOSITION1`, `EQUATION-PARAMETERS1`, `EQUATION-SYSTEMS1`, `EQUATION-PROOF-PERFORMANCE1`, `EQUATION-RESULT-CONTRACT1`, `EQUATION-PRESENTATION1`, `EQUATION-ADOPTION1` and `EQUATION-CERTIFIED-NUMERICS1` are complete. Each later gate needs its own approval, and gates may be split, merged or reordered when evidence requires; the reason must be recorded.

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

Done: stage 15 `EQUATION-CERTIFIED-NUMERICS1`, renumbered from 16 (see the order change below the stage table; [specification](equation-certified-numerics1-spec.md)). PR A (one variable, #25): certified isolated real roots as the schema-7 binder `isolated-real-root`, range rows, an independent exclusion verifier and the "Certified" line. PR B (square systems): the schema-7 binder `isolated-real-point`, HC4 contraction, floating-point Newton guesses proven by the exact Krawczyk test, branch and prune with an independent exclusion cover, and a fix for systems eliminated to one numeric root. Done: stage 16 `EQUATION-SEMIALGEBRAIC1` ([specification](equation-semialgebraic1-spec.md)). PR A (#27): rows with ∧, ∨ and ¬; cylindrical algebraic decomposition (Lazard's projection, equational constraints, partial lifting); Reduce-style regions as the schema-7 set kind `cylindrical`; a verifier by samples and a reversed variable order; Logic keys and symbol tooltips. PR B: every free name an unknown when no row is an equation; ∀ and ∃ by quantifier elimination with True/False statements (schema-7 `truth`); parameters through the decomposition as Reduce-style cases; coupled assumptions decided exactly. Next: stage 17 `EQUATION-RECONSTRUCTION-CLOSEOUT1`, with its own approval.

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
| 15 (verified) | `EQUATION-CERTIFIED-NUMERICS1` (slice 8) | Interval Newton and Krawczyk on bounded intervals, exclusion proofs. PR A: one variable (isolated real roots, range rows). PR B: square systems | N cases certified; numerical results typed as numerical |
| 16 (verified) | `EQUATION-SEMIALGEBRAIC1` (slice 7) | CAD for real systems with inequalities; rows with ∧ ∨ ¬; ∀ ∃ by quantifier elimination; parameters through the decomposition | Feasibility and decision cases |
| 17 | `EQUATION-RECONSTRUCTION-CLOSEOUT1` | Corpus parity, then retirement of the old Equation engine | Capability ledger; no regression versus the baseline table |

**Order change (user decision, 2026-10-07):** certified numerics now comes before the semialgebraic gate, and the stage numbers were swapped (15 ↔ 16); the gate names and slice numbers are unchanged. Numerics serves common single equations that end in "Not solved yet" today (cos x = x, eˣ + x³ = 5), while CAD mostly serves inequality systems and several-parameter problems; neither blocks the other.

Stages 15 and 16 may move before adoption if the user wants them in the first product release. Adoption can also happen earlier with fewer slices, because V6 is designed to grow by kinds.

## Native core (user decision, 2026-10-07)

The Equation core is to be rewritten in Rust: a native desktop build (Tauri) and a WebAssembly build for the web from the same code, desktop-first, giving identical answers everywhere; matching desktop speed on the web for demanding cases is not a priority. This is far off: it is not the step after this roadmap, but comes after the other workspace reconstructions (Integration first). Differential equations are a separate future roadmap as well.

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

## Phases (user decisions, 2026-10-14)

| Phase | Contents |
| --- | --- |
| **Phase 1** | This roadmap: stages 1–17, ending with `EQUATION-RECONSTRUCTION-CLOSEOUT1`. |
| **Phase 2** | The follow-up ledger below; ordinary differential equations; recurrences, with the same operator algebra; |z|, Re, Im, arg and conj on unknowns (C1); ⌊x⌋, ⌈x⌉ and mod as kernels (E5); wider ℂ coverage (C2–C7); the certified-numerics expansion above; the benchmark stage (E1); other enhancements. |
| **Phase 3** | Special functions (S1–S9, [priority list](special-functions-priority.md)); partial differential equations (E3); the integer domain and Diophantine equations (E4). |
| **Place to be decided** | Items that need another workspace or a decision on where they live: matrix equations (E6), global History, step-by-step explanations through MCP, the shared-editor MathLive bug. Not scheduled until the place is chosen. |

Rules for the ledger:
- An "unassigned" row that is plain Equation work goes to Phase 2.
- A row that needs another workspace goes to "place to be decided".

**Holonomic foundation:** the operator algebra (linear differential operators, closure, recurrences, certified evaluation) is built in Phase 2 for ODEs. The special-function layers (pFq, Meijer G) sit on top of it in Phase 3.

**Matrix equations, option 3 (direction only, not scheduled):**
- one shared exact linear-algebra core, built when a stage needs it, and owned by no single workspace;
- the Matrix workspace is the native home and shows the full detail;
- Equation also accepts matrix rows and shows a compact answer, with a link to Matrix;
- same input, same answer, same verification in both places.

The Matrix workspace itself has no design and no schedule yet; it will be designed from scratch.

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
- ~~Whether complex modulus and complex radicals (`unsupported` since stage 7, by user decision) get a gate of their own.~~ Decided 2026-10-14: Phase 2 (C1).
- Multivalued functions over ℂ (C6) are decided: the principal value, as already used since stage 9 (log z = ln|z| + i·Arg z with Arg ∈ (−π, π], √z with Re ≥ 0, z^w = e^{w·log z}), matching Mathematica.

## Deferred follow-ups (all gates)

The user asked for one ledger of everything the gates deferred (2026-10-04, `EQUATION-PARAMETERS1`). Each item names where it came from and the gate or phase that owns it (since 2026-10-14, former "unassigned" rows read "Phase 2" or "place to be decided"; see Phases above). Later gates append to this table and strike items they close. None of these is a cap: each is refused honestly today, naming its owner.

| Item | From | Owner |
| --- | --- | --- |
| ~~Non-real points ordered by canonical identity, not numerically (display order)~~ (closed by `EQUATION-PRESENTATION1`) | `EQUATION-POLYNOMIAL-DECISION1` | `EQUATION-PRESENTATION1` |
| ~~Radical presentation: √D unsimplified (½·√8), √12 rather than 2√3, −(1 − e) not distributed, asin/atan residues not normalized~~ (closed by `EQUATION-PRESENTATION1`) | slices 1, 2 and 4 | `EQUATION-PRESENTATION1` |
| Two different closed forms of one value ordered only by refinement under the budget (the gate-6 caveat) | `EQUATION-GENERATORS1`, `EQUATION-PERIODIC1` | Phase 2 |
| Wider Lambert W simplification (several log bases) and algebraic bases with non-binomial minimal polynomials in the exponent lattice | `EQUATION-GENERATORS1` | Phase 2 |
| Dependent radicals (norm identically zero, e.g. √(x²+2x+1)) | `EQUATION-CONSTRAINTS1` | Phase 2 |
| Complex modulus and complex radicals (`unsupported` by decision) | `EQUATION-CONSTRAINTS1` | Phase 2 (C1, user decision 2026-10-14) |
| ~~Transcendental constants inside a radical tower (√x + √(x+1) = ln 2)~~ (closed by `EQUATION-CERTIFIED-NUMERICS1` PR A: √x + √(x+1) = ln 5 gives a certified root) | `EQUATION-CONSTRAINTS1` | `EQUATION-CERTIFIED-NUMERICS1` |
| ~~Radical forms beyond quadratic and pure binomial roots (S4 stays a RootOf)~~ (closed by `EQUATION-PRESENTATION1`) | `EQUATION-CONSTRAINTS1` | `EQUATION-PRESENTATION1` |
| Families in several integer parameters under further conditions | `EQUATION-PERIODIC1` | Phase 2 |
| The complement of an infinite family over ℂ (needs a set kind; not in V6's first version, user decision 2026-10-04) | `EQUATION-PERIODIC1` (part B) | a later V6 kind, with the slice that produces it |
| Complex intersections and exclusions with non-affine families; nested families whose level is quadratic in its parameter | `EQUATION-PERIODIC1`, `EQUATION-COMPOSITION1` | Phase 2 |
| Interval families need one common trig argument with a peelable inverse | `EQUATION-COMPOSITION1` | Phase 2 |
| ~~Non-closed-form boundaries and isolated numeric roots (eˣ + sin x > 0)~~ (closed by `EQUATION-CERTIFIED-NUMERICS1` PR A, with a range row when there are infinitely many) | `EQUATION-COMPOSITION1` | `EQUATION-CERTIFIED-NUMERICS1` |
| ~~Depth-25 periodic chains cost about 100 s with verification~~ (closed: about 0.6 s, `EQUATION-PROOF-PERFORMANCE1` part A) | `EQUATION-COMPOSITION1` | `EQUATION-PROOF-PERFORMANCE1` |
| Recursive walks of nested solution sets (normalization, keys, wire). The parameters gate builds flat case trees (one level), so the walks stay shallow; nested case trees would need explicit stacks | `EQUATION-REPRESENTATION1` | the gate that first nests case trees |
| ~~Conjunctions of several relations in the target with several parameters; real roots of degree ≥ 3 with several parameters; deciding whether a several-parameter case is empty~~ (closed by `EQUATION-SEMIALGEBRAIC1` PR B, over ℝ for polynomial rows) | `EQUATION-PARAMETERS1` | `EQUATION-SEMIALGEBRAIC1` |
| Excluding the roots of a parametric polynomial of degree ≥ 3 over ℂ | `EQUATION-PARAMETERS1` | Phase 2 |
| Mixed kernels with parameters (eˣ + a·sin x, eˣ + a·x, √x + √(x+a)) | `EQUATION-PARAMETERS1` | Phase 2 |
| Kernel levels of degree ≥ 2 in the kernel with parameters (e^{2x} + a·eˣ = 1), nested kernels, non-affine kernel arguments, the target in an exponent, tan/arcs/Lambert W with parameters, non-unit rational powers | `EQUATION-PARAMETERS1` | Phase 2 |
| sin/cos inequalities with parameters (parametric arcs per period) | `EQUATION-PARAMETERS1` | Phase 2 |
| Kernels with parameters over ℂ (e^{az} = b as (ln b + 2πik)/a) | `EQUATION-PARAMETERS1` | Phase 2 |
| A RootOf expression node, so roots with transcendental coefficients can sit inside kernels (e^{3x} + π·eˣ = e; ln(x³ + x) = 1 at degree 3) | `EQUATION-PARAMETERS1` | Phase 2 |
| Transcendental constants together with parameters (π·x = a); several relations or ≠ with transcendental constants over ℂ | `EQUATION-PARAMETERS1` | Phase 2 |
| ~~Choosing the target automatically (prefer x, then other conventions); today the caller names it~~ (closed by `EQUATION-ADOPTION1`: x, y, z, t, then alphabetical, editable) | `EQUATION-PARAMETERS1` (user question) | `EQUATION-ADOPTION1` |
| Complex or algebraic coefficients in systems (the polynomial atoms read rational coefficients) | `EQUATION-SYSTEMS1` | Phase 2 |
| Nonlinear systems with parameters (comprehensive Gröbner systems) | `EQUATION-SYSTEMS1` | Phase 2 |
| Kernels with parameters or extra conditions in a system; elimination that leaves several targets or interval answers | `EQUATION-SYSTEMS1` | Phase 2 |
| Positive-dimensional systems that are not triangular, or whose dependent target needs a root of degree ≥ 3 (regular-chain triangular decomposition) | `EQUATION-SYSTEMS1` | Phase 2 |
| ~~Systems with no exactly isolable target among kernels (eˣ + sin y = 1, eʸ + sin x = 1)~~ (closed by `EQUATION-CERTIFIED-NUMERICS1` PR B: square systems, with range rows where unbounded) | `EQUATION-SYSTEMS1` | `EQUATION-CERTIFIED-NUMERICS1` PR B |
| Evidence cases still over 1 s to decide and verify (atan x + atan 2x = π/4 at 1.8 s; the depth-25 ln chain at 1.1 s); the user accepted them for now (2026-10-04) | `EQUATION-PROOF-PERFORMANCE1` | a later performance gate |
| Radical simplification inside expressions with free symbols (√(−4(y² − 1)) is not shown as 2√(1 − y²)); rewrites are proven only on constant subexpressions | `EQUATION-PRESENTATION1` | Phase 2 |
| Closed forms for pure binomial roots inside larger values (e^{r₁} with r₁ = ∛4 shows r₁ and its definition) | `EQUATION-PRESENTATION1` | Phase 2 |
| The detailed verification report (one entry per check behind "Verified exactly") | `EQUATION-ADOPTION1` (user decision) | `EQUATION-VERIFICATION-REPORT1` |
| Global History for New Equation; export, open and verify of saved problems | `EQUATION-ADOPTION1` (user decision) | place to be decided |
| Step-by-step explanations, by an agent through MCP in Notebook | `EQUATION-ADOPTION1` (user decision) | place to be decided |
| ~~Assumptions coupling several parameters beyond monomials (cases kept as they are, with a note)~~ (closed by `EQUATION-SEMIALGEBRAIC1` PR B for polynomial conditions over ℝ: decided by a partial decomposition) | `EQUATION-ADOPTION1` | `EQUATION-SEMIALGEBRAIC1` |
| Nested absolute values (\|x − \|x − 1\|\| = 1) stop with an internal "division-by-zero: rational inverse" error instead of an answer | user test cases, 2026-10-05 | Phase 2 (constraints slice) |
| Complex radicals shown as √(−3) and √(−16) instead of √3·i and 4i in roots of quadratics over ℂ | user test cases, 2026-10-05 | Phase 2 (presentation) |
| Parametric system values laid out as −(z − 1)/2 and −(−1 − a)/2 instead of (1 − z)/2 and (a + 1)/2 | user test cases, 2026-10-05 | Phase 2 (presentation) |
| ~~Finite system points checked by substituting separate algebraic coordinates (composed resultants: x³y² + x = 4y, x + y = 7 − x² took 11 s over ℝ and 66 s over ℂ to verify, then over a minute to lay out over ℂ)~~ (closed by `NEW-EQUATION-RESPONSIVE1`) | user test cases, 2026-10-07 | `NEW-EQUATION-RESPONSIVE1` |
| Points whose coordinates are not exact algebraic numbers (closed forms with transcendental parts) still verify by exact substitution, which can be slow for high degrees | `NEW-EQUATION-RESPONSIVE1` | Phase 2 (systems) |
| Non-real decimals and order fall back to exact real and imaginary parts (slow for high degrees) on a rounding tie, a real part that may be zero, or equal real parts of different numbers | `NEW-EQUATION-RESPONSIVE1` | Phase 2 (presentation) |
| Positive-dimensional and parametric systems still verify by re-deriving at samples; their timing was not measured in this gate | `NEW-EQUATION-RESPONSIVE1` | Phase 2 (systems) |
| MathLive keeps a phantom open fence after an unbalanced `\left(` is set programmatically: every later `setValue` (even `''`) ends in `\left(\right.`. Typing is unaffected (typing `(` inserts a balanced pair); select-all and delete clears it. Reproduced on a bare `math-field` outside the app | post-merge Playwright check, 2026-10-07 | place to be decided |
| Case conditions are not simplified: x²yc + x³ = axy shows "If ax − cx² = 0 and x³ = 0" where x = 0 says the same, and ax − cx² is not shown factored as x(a − cx) | user test case, 2026-10-07 | Phase 2 (presentation) |
| ~~"Some cases could not be checked against the assumptions" appears whenever case conditions couple several parameters (x²yc + x³ = axy with a ≠ 0, a < 0 or a > 0)~~ (closed by `EQUATION-SEMIALGEBRAIC1` PR B) | user test case, 2026-10-07 | `EQUATION-SEMIALGEBRAIC1` |
| ~~A stray vertical scrollbar beside tall answer rows (fractions), from `overflow-x: auto` on the math row~~ (fixed 2026-10-07, `overflow-y: hidden`) | user test case, 2026-10-07 | `NEW-EQUATION-RESPONSIVE1` follow-up |
| Over-determined non-polynomial systems (an extra equation cannot be certified exactly zero at a numeric point) | `EQUATION-CERTIFIED-NUMERICS1` (plan) | Phase 2 |
| Under-determined non-polynomial systems (the answer is a curve; needs a representation gate) | `EQUATION-CERTIFIED-NUMERICS1` (plan) | Phase 2 |
| Tangent or double non-polynomial roots (no sign change, so uniqueness cannot be proven; one variable runs to the work limit, systems are refused when detected: eˣ + sin y = 1, eʸ + sin x = 1 at (0, 0)); needs deflation or topological degree | `EQUATION-CERTIFIED-NUMERICS1` | expansion roadmap |
| Non-polynomial systems with inequalities | `EQUATION-CERTIFIED-NUMERICS1` (plan) | beside `EQUATION-SEMIALGEBRAIC1` |
| tan inside mixed expressions (tan x = x) is still refused: the finder does not cut at the poles of tan | `EQUATION-CERTIFIED-NUMERICS1` PR A | Phase 2 |
| Definition rows show the normalized expression (10 − e^{x ln 3} − e^{x ln 2} = 0 for 2ˣ + 3ˣ = 10) rather than the typed one | `EQUATION-CERTIFIED-NUMERICS1` PR A | Phase 2 (presentation) |
| Numeric roots over ℂ (complex isolation of non-polynomial expressions) stay refused | `EQUATION-CERTIFIED-NUMERICS1` PR A | Phase 2 |
| The independent completeness cover applies to one equation plus constant range rows; inequalities and other shapes rely on each root's certificate plus re-derivation | `EQUATION-CERTIFIED-NUMERICS1` PR A | Phase 2 |
| Systems after exact elimination (and systems where it reduces to one numeric root) are proven by certificates, identity and re-derivation; the independent box cover runs only for systems decided wholly numerically | `EQUATION-CERTIFIED-NUMERICS1` PR B | Phase 2 |
| ~~Range rows on exact polynomial systems (x² + y² = 5, xy = 2 with 0 ≤ x ≤ 3) are refused as inequalities in a system~~ (closed by `EQUATION-SEMIALGEBRAIC1` PR A: decided by cylindrical decomposition) | `EQUATION-CERTIFIED-NUMERICS1` PR B | `EQUATION-SEMIALGEBRAIC1` |
| Conditions and ≠ rows in systems with kernels; systems with kernels over ℂ | `EQUATION-CERTIFIED-NUMERICS1` PR B | Phase 2 |
| A numeric system solution exactly on a range-row boundary (not an exact rational point) is refused | `EQUATION-CERTIFIED-NUMERICS1` PR B | Phase 2 |
| Solutions exact but not rational, such as (0, 0, ±√3), are shown as certified decimals (only wholly rational points are recognised exactly; PSLQ recognition is on the expansion roadmap) | `EQUATION-CERTIFIED-NUMERICS1` PR B | expansion roadmap |
| ~~Systems reduced by elimination to one numeric root verified forever (y = sin x, x + eʸ = 2)~~ (fixed in PR B: zero by identity in the root's variable) | `EQUATION-CERTIFIED-NUMERICS1` PR A | `EQUATION-CERTIFIED-NUMERICS1` PR B |
| An exact root where f′ = 0 (a closed-form double root next to numeric roots) skips the cover | `EQUATION-CERTIFIED-NUMERICS1` PR A | Phase 2 |
| Decomposition answers are verified at re-derivation strength (exact checks at each claimed cell's sample and a decomposition in the reversed variable order), not by a certificate | `EQUATION-SEMIALGEBRAIC1` PR A | expansion roadmap |
| Cylindrical algebraic coverings (fast feasibility for conjunctions) and single-cell or NLSAT-style search | `EQUATION-SEMIALGEBRAIC1` PR A | expansion roadmap |
| Four or more unknowns often end in a work stop (the decomposition is doubly exponential in the number of variables, by nature) | `EQUATION-SEMIALGEBRAIC1` PR A | expansion roadmap |
| ~~Rows with only inequalities choose one unknown automatically (one per equation row)~~ (closed by `EQUATION-SEMIALGEBRAIC1` PR B, user decision 2026-10-07: with no equation, every free name is an unknown) | `EQUATION-SEMIALGEBRAIC1` PR A | `EQUATION-SEMIALGEBRAIC1` PR B |
| Cell merging is decided at one sample of the section between them; descriptions in three or more unknowns that differ only symbolically (equal after simplification) stay separate cells | `EQUATION-SEMIALGEBRAIC1` PR A | Phase 2 (presentation) |
| Decimal style shows integer cell ends as 1.000000 (as interval answers do) | `EQUATION-SEMIALGEBRAIC1` PR A | Phase 2 (presentation) |
| Quantifiers on non-polynomial rows, over ℂ, and with a denominator in a quantified variable | `EQUATION-SEMIALGEBRAIC1` | Phase 2 |
| Parameter cases bounded by a root of degree ≥ 3 in the other parameters have no condition form and are refused | `EQUATION-SEMIALGEBRAIC1` PR B | Phase 2 (needs a root value inside conditions) |
| No multivariate factorization: only powers of the unknown split off, so a polynomial with other factors keeps "k-th root" bounds where a factored form would give closed forms | `EQUATION-SEMIALGEBRAIC1` PR B | expansion roadmap |
| Quotients with free symbols are not cancelled in closed forms (2ac/c² is not shown as 2a/c), and products of radicals are not joined (√a·√2/2) | `EQUATION-SEMIALGEBRAIC1` PR B | Phase 2 (presentation) |
| Answers with parameters through the decomposition are checked at every cell of a reversed-order decomposition (cases disjoint and covering), not also at samples of each claimed case | `EQUATION-SEMIALGEBRAIC1` PR B | Phase 2 |

### Phase 2 and Phase 3 items (user decisions, 2026-10-14)

| # | Item | Owner |
| --- | --- | --- |
| S1 | Holonomic foundation: functions held as a linear ODE plus initial conditions; operator algebra, closure (sum, product, algebraic substitution), exact zero test, series via recurrences, certified evaluation | Phase 2 (operator algebra, for ODEs); Phase 3 (special functions) |
| S2 | pFq layer: names and recognition (₁F₁(½; 3/2; −x²) → erf), contiguous relations, the Kummer, Pfaff and Euler transformations, symbolic parameters | Phase 3 |
| S3 | Meijer G layer: definite integrals and transforms by Mellin convolution, products of special functions (shared with the Integration reconstruction) | Phase 3 |
| S4 | Modules for functions outside the holonomic class: the Γ family (Γ, ψ, B, Γ ratios); inverses (all branches of Lambert W, Wright ω, generalized W, Γ⁻¹); elliptic functions (sn, cn, dn, ℘, θ); ζ and the polylogarithm in s; Painlevé last | Phase 3 |
| S5 | What "covered" means for each function: certified evaluation at any precision (ℂ included, DLMF branch cuts); derivatives, series and asymptotics; identities; inverses and zeros; use in the solver and as an answer; verification | Phase 3 |
| S6 | Scope by tier: tiers 1–2 at full depth; tiers 3–4 with a name, numerics and a conversion rule; tier 5 belongs to other workspaces (number theory, combinatorics); tier 6 only on request ([list](special-functions-priority.md)) | Phase 3 |
| S7 | Ball arithmetic for special functions, built on the dyadic-ball step of the certified-numerics expansion | Phase 3 |
| S8 | Contract and UI for every new function: expression nodes in the result schema, printer, keyboard keys and tooltips | Phase 3 |
| S9 | Equations special functions unlock: x^x = a, aˣ = bx + c, polynomial–exponential mixes, Γ(x) = a, and e^z = z over ℂ (roots −W_k(−1), an infinite family) | Phase 3 |
| C1 | \|z\|, Re z, Im z, arg z and z̄ on unknowns over ℂ (\|z − 1\| = 2, Re z > 0 ∧ \|z\| < 3) | Phase 2 |
| C2 | Turn \|z\|, Re and Im rows into real problems: z = a + bi, decided by the stage-16 decomposition | Phase 2 |
| C3 | Regions in ℂ as answers (discs, half-planes, annuli): the cylindrical kind over (Re, Im) shown in complex notation, or a new set kind | Phase 2 |
| C4 | Quantifiers and parameters over ℂ: quantifier elimination over ℂ (comprehensive Gröbner systems), constructible sets (equations plus ≠) as answers | Phase 2 |
| C5 | Certified roots of non-polynomial functions over ℂ: Krawczyk on complex boxes, with the argument principle to prove completeness | Phase 2 |
| C6 | Multivalued functions over ℂ: the principal value (decided). Extend it consistently to z^w with symbolic w, inverse trig over ℂ and Lambert W branches; explicit branch functions such as W_k may come later | Phase 2 |
| C7 | Display a + bi by default, with an optional polar form re^{iθ} | Phase 2 |
| E1 | Benchmark stage: the Kamke ODE collection (about 1,900), the `Solve`/`Reduce`/`DSolve` documentation examples of Mathematica, SageMath's `solve` doctests. Count solved, refused with a typed reason, wrong (target 0), and time per case. Claim parity with other systems only from these numbers. | Phase 2 |
| E2 | Recurrences (the analogue of Mathematica's `RSolve`), with the ODE operator algebra | Phase 2 |
| E3 | Partial differential equations, classical linear ones first | Phase 3 |
| E4 | Integer domain: linear Diophantine and Pell equations, modular equations, finite fields | Phase 3 |
| E5 | ⌊x⌋, ⌈x⌉ and mod as kernels the user can type | Phase 2 |
| E6 | Matrix equations (AX = B, Sylvester, det(A − λI) = 0, X² = A): option 3, one shared core with Matrix as the native home and an Equation entry point | place to be decided |
| E7 | Native-core speed for scale (large Gröbner bases, decompositions in four or more variables): the Rust core above | after the other workspace reconstructions |

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
