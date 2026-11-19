# Equation Phase 2 — Handoff for Review

Date: 2026-11-19. Status: **agreed scope plus open questions; not a final plan.** Written for an outside reviewer (another AI or a person) who has **not** seen the repository. Please read the ground rules first: several "obvious" suggestions are ruled out on purpose.

## 1. Context

REZANOVA is an open-source mathematics workbench (TypeScript + React + Tauri, browser and Linux desktop). Its Equation workspace was rebuilt from scratch in **Phase 1** (stages 1–17, 3–16 October 2026) on general decision procedures instead of family-by-family routes. The core lives in `src/lib/symbolic-engine/equation/`.

What Phase 1 delivered, all exact and independently verified before an answer is shown:

- exact arithmetic, polynomial factorization over ℚ, real and complex root isolation with exact algebraic numbers (`RootOf`);
- polynomial and rational equations and inequalities of any degree over ℝ and ℂ;
- exponentials, logarithms, Lambert W; absolute values and radicals; trigonometric equations as exact periodic families; deep compositions;
- parameters as exact case trees;
- polynomial systems by Gröbner bases (exact points in one number field, positive-dimensional families);
- certified numeric roots and square systems (interval Newton, Krawczyk) when no closed form exists;
- cylindrical algebraic decomposition (Lazard projection with equational constraints) for regions with ∧, ∨, ¬, answered like Mathematica's `Reduce`;
- ∀/∃ by quantifier elimination (True/False for closed statements);
- a second, independent check of every answer (substitution, number-field checks, certificates, or a second decomposition in another variable order).

A 1,540-problem corpus (3,080 runs over ℝ and ℂ) finishes with no failed verifications, crashes or internal errors; median 6 ms per run, every run under 60 s. Development is currently paused (the owner is studying); Phase 2 starts when it resumes.

## 2. Ground rules (binding; please do not suggest breaking them)

1. **Exact and verified.** Every answer is checked independently before it is shown.
2. **No partial answers.** A problem is either decided completely or ends with a *typed refusal* naming the reason (or a proof that no answer of the requested kind exists).
3. **No caps.** Long runs end only at typed work, memory or user-Stop limits. Published timing figures (e.g. "under 0.5 s typical, under 5 s for the heaviest cases") are comparison targets against other systems, never limits in code.
4. **No heuristics without the owner's approval.** Where only heuristics seem available (methods that may find answers but cannot prove they found all of them), the literature is searched first for a decision procedure or newer complete method, and the owner decides.
5. **No shared math logic between workspaces.** Each workspace (Equation, Integration, Graphing, Notebook, …) keeps its own private math code, so parallel agents can work one workspace each without drifting into each other. **One approved exception:** Equation's ODE solving calls the Integration workspace's public service for indefinite integrals, read-only; Integration (a separate program) remains the only owner.
6. **Pure TypeScript now, Rust later.** A native Rust core (desktop + WebAssembly) comes after the other workspaces are rebuilt. No new runtime math dependencies; files stay under 1,000 lines.
7. **Galois-group work** (e.g. writing a solvable quintic's roots in radicals) needs the owner's approval before it is attempted.

## 3. Agreed Phase 2 scope

Grouped into workstreams. The order inside Phase 2 is **not** decided, except that ODEs and recurrences come last (see 3.8).

### 3.1 Cylindrical decomposition: speed (measured problems)

- **Exact zero signs:** zero signs at sample points are proven by bisecting to the Liouville bound (4,700–9,300 bits on four measured cases) although every nonzero sign is decided at 32 bits. Fix: take zeros from the cell's known sections and the row's own factors; use Newton or quadratic interval refinement instead of bisection where an exact zero test remains.
- **Verifier variable order:** the independent second decomposition always uses the reversed variable order, which runs out of work on three cases where other orders take 0.2–1.3 s. Fix: try orders by the projection's degree-sum ranking, each with a share of the work budget.
- **Homogeneity reduction:** IMO 2006 P3 (∀a,b,c: ab(a²−b²)+bc(b²−c²)+ca(c²−a²) ≤ M·(a²+b²+c²)², answer M ≥ 9√2/32) runs out of work after ~114 s in four variables; normalising a homogeneous problem removes one.
- Answers with parameters through the decomposition: also check at samples of each claimed case.
- Cell merging decided symbolically, not at one sample.

### 3.2 Systems

- **Nonlinear systems with parameters.** Direction under study (a research lead, see §5): Generic Rational Univariate Representation for the main parameter branch, the discriminant variety for the special values, recursion on those; comprehensive Gröbner systems as the fallback.
- **A root value inside conditions:** cases bounded by a root of degree ≥ 3 in the other parameters (Mathematica-`Root`-style conditions). Needed by the row above and by outer-power decompositions.
- **Positive-dimensional systems** that are not triangular, or whose dependent target needs a root of degree ≥ 3: regular-chain triangular decomposition (also as a pre-reduction before the decomposition).
- Complex or algebraic coefficients in systems; kernels (eˣ, sin, …) with parameters or extra conditions in systems; elimination that leaves several targets or interval answers.
- Over-determined and under-determined non-polynomial systems (the latter need a curve answer kind, see 3.6).
- Verification speed of positive-dimensional and parametric systems.

### 3.3 Complex numbers (C1–C7)

- **C1** |z|, Re z, Im z, arg z and z̄ on unknowns.
- **C2** Such rows turned into real problems (z = a + bi) and decided by the decomposition.
- **C3** Regions in ℂ as answers (discs, half-planes, annuli).
- **C4** Quantifiers and parameters over ℂ; constructible sets (equations plus ≠) as answers.
- **C5** Certified roots of non-polynomial functions over ℂ: Krawczyk on complex boxes, completeness by the argument principle.
- **C6** The principal value (decided) extended consistently to z^w with symbolic w, inverse trig over ℂ and Lambert W branches.
- **C7** a + bi display by default, optional polar form.
- Also: numeric roots over ℂ of non-polynomial expressions; kernels with parameters over ℂ; exact real/imaginary parts of algebraic numbers off the unit circle (resultants of degree d² reach the work limit today).

### 3.4 Kernels, families and input

- **E5** ⌊x⌋, ⌈x⌉ and mod as kernels the user can type.
- Mixed kernels with parameters (eˣ + a·sin x, eˣ + a·x, √x + √(x+a)); kernel levels of degree ≥ 2 with parameters (e^{2x} + a·eˣ = 1); nested kernels; non-affine kernel arguments; tan, arcs and Lambert W with parameters; sin/cos inequalities with parameters.
- A `RootOf` expression node so roots with transcendental coefficients can sit inside kernels (e^{3x} + π·eˣ = e).
- Transcendental constants together with parameters (π·x = a).
- Dependent radicals (√(x²+2x+1)); inequalities with radicals in several unknowns (IMO 2001 P5); nested absolute values (|x − |x − 1|| = 1, currently an internal error: a bug).
- Wider Lambert W simplification; periodic families in several integer parameters; tan inside mixed expressions (cut at the poles of tan).
- Quantifiers on non-polynomial rows, over ℂ, and with a denominator in a quantified variable.
- The constant i in Real mode with parameters or several unknowns.
- Row reader: `M(…)` is read as a function application (must be `M·(…)` today); subscripted names, ±, ∪, Max/Min, factorial and degree signs.

### 3.5 Presentation

- Simplify and factor case conditions ("ax − cx² = 0 and x³ = 0" → "x = 0").
- Proven radical simplification with free symbols (√(−4(y²−1)) → 2√(1−y²)); complex radicals as √3·i; cancel quotients (2ac/c² → 2a/c); join radical products; tidy signs ((1 − z)/2, not −(z − 1)/2).
- Closed forms for pure binomial roots inside larger values; definition rows showing the typed equation rather than its normalized form; integer cell ends without decimals in Decimal style.

### 3.6 Certified-numerics expansion (ordered by value)

1. Ball arithmetic (midpoint + radius, outward rounding) instead of growing rational endpoints — the speed foundation.
2. Fewer refusals: bounds proven automatically, Descartes/Rolle root counting for exponential sums, the Hansen–Sengupta contractor; completeness covers for inequalities and systems after elimination; exact double roots next to numeric ones.
3. Digits back to exact: PSLQ/LLL recognition of a closed form from certified digits, then an exact proof.
4. Hard cases, **each needing an owner decision first:** exp-log root isolation conditional on Schanuel's conjecture; deflation and topological degree for multiple roots.
5. New answer kinds: certified curves (under-determined systems) and pavings (non-polynomial inequality systems).
6. Heavy tools when needed: Taylor models; homotopy continuation with certified path tracking.

### 3.7 Benchmark (E1)

The Kamke ODE collection (~1,900), Mathematica's `Solve`/`Reduce`/`DSolve` documentation examples, SageMath's `solve` doctests. Count solved, refused with a typed reason, wrong (target 0), and time per case. Parity with other systems is claimed only from these numbers.

### 3.8 Differential equations and recurrences — last in Phase 2

- **S1, holonomic foundation:** functions held as a linear ODE plus initial conditions; operator algebra (Ore algebras), closure (sum, product, algebraic substitution), exact zero test, series via recurrences, certified evaluation.
- **Linear ODEs:** rational solutions (Abramov), Liouvillian solutions (Kovacic for order 2, Singer-style beyond), hypergeometric solutions (van Hoeij and others); a *proof* when no solution of a kind exists (differential Galois theory); otherwise the solution as a holonomic object.
- **Core pFq (decided 2026-11-19: included in Phase 2):** ₀F₁, ₁F₁ and ₂F₁ with their named cases (Bessel, Airy, Kummer/Whittaker, Legendre, erf), so linear ODEs get special-function answers. The full pFq machinery, Meijer G and the other special-function modules stay in Phase 3.
- **E2, recurrences** (the analogue of `RSolve`), on the same operator algebra.
- **Indefinite integrals inside ODE answers** come from the Integration workspace (the approved exception in rule 5). That is why ODEs come last: Integration covers more integrands first. An integral Integration cannot yet decide stays a typed refusal or an unevaluated, checked integral — never a guess.
- Nonlinear ODEs are mostly heuristic territory and fall under rule 4.

## 4. Open questions

The owner will answer these later; suggestions are welcome.

1. **Where stochastic, delay, fractional and integral equations live:** Phase 3 after PDEs, or "place to be decided". None is in the roadmap yet.
2. **Regression corpus now?** Whether the olympiad cases already proven by the engine (IMO 1983 P6, IMO 1984 P1, Nesbitt, IMO 1995 P2, IMO 2008 P2(a); each by showing the negation is empty) enter the regression corpus now.
3. **How to grade "passing" in benchmarks** when many hard cases have no closed form. Proposal (not adopted), an outcome ladder from strongest to weakest:
   - exact answer, verified;
   - proof of impossibility (no solution, no elementary antiderivative, no Liouvillian solution);
   - exact answer in a representation (`RootOf`, holonomic object, series with exact terms);
   - certified numeric (proven digits or boxes, completeness proven);
   - honest typed refusal;
   - wrong (always a fail; target 0).

   Each case would record a *reference outcome*, the strongest rung known to be achievable. Pass means reaching it, verified. Partial means a lower verified rung. Gap means a refusal where more is known possible. For open research cases, an honest refusal is the pass.
4. **A heuristic outcome kind** ("found these; completeness not proven"). This does not exist and would need a design decision under rule 4.

## 5. Research leads found (not adopted)

- **Parametric systems:**
  - Generic Rational Univariate Representation (Corniquel, 2026, arXiv 2602.06817): a generic parametrisation with degree and height bounds. It covers generic parameter values only, so it needs the discriminant variety plus recursion, or comprehensive Gröbner systems, for completeness.
  - Parametric RUR with a full partition of the parameter space: Wang, Wei, Xiao and Zheng (arXiv 2403.16519).
- **Quantifier elimination:**
  - CAD-based QE with multiple equational constraints and parameter-aware output (arXiv 2604.23873, 2026);
  - QE meets treewidth (arXiv 2601.00312, TACAS 2026);
  - minimum CADs of algebraic sets in dimension three (ISSAC 2026);
  - non-uniform CAD for QE (arXiv 2508.00505).
- **Holonomic layer:**
  - reduction-based creative telescoping for holonomic functions (Brochet, thesis 2026);
  - faster multivariate integration in D-modules (Brochet, Chyzak and Lairez, arXiv 2504.12724);
  - partial Weyl closure (arXiv 2602.06209).
- **Certified numerics:** a priori bounds for certified Krawczyk homotopy tracking (arXiv 2512.01355).
- **Nothing new found for:** general linear ODE solving (latest is third-order Liouvillian solutions, arXiv 2402.05143) and general Meijer G / pFq algorithms.

## 6. Out of Phase 2 (for orientation)

- **Phase 3:**
  - full special functions on the holonomic foundation (pFq, Meijer G);
  - non-holonomic modules (Γ family, Lambert W branches, elliptic functions, ζ/polylog, Painlevé);
  - PDEs (classical linear first);
  - the integer domain and Diophantine equations;
  - an "ultimate" cross-domain benchmark.
- **Place to be decided:** matrix equations (Equation would use its own private linear algebra), global History, step-by-step explanations.
- **Later:** the Rust native core.

## 7. What we would like from the reviewer

- An order for the Phase 2 workstreams, with reasons (dependencies, risk, value). ODEs must stay last.
- Missing items, or items that belong elsewhere.
- Algorithm choices for 3.1, 3.2 and 3.8, preferring complete decision procedures with clear verification; please cite papers.
- Risks: places where the rules in §2 will be hardest to keep, and how to keep them.
- Views on the open questions in §4.

Please do not propose time caps, heuristics presented as complete methods, shared code between workspaces (beyond the one exception), or external CAS dependencies.
