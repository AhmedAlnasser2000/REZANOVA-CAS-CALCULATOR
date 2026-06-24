# Codex Handoff — Equation Algorithms: Polynomial Roots Through All Transcendental Families

**Scope:** Equation workspace only. No integration, differentiation, limits,
series, linear algebra, ODE, PDE, or graphing. Pure symbolic equation solving.

**Governing rule:** Never build something that reads from a layer you still
intend to change. Dependency order below is the build order.

---

## Prerequisites confirmed in the repo before starting

All five symbolic primitives are live and tested:
- `SYMBOLIC-EXPANSION-PRIMITIVE1` — bounded MathJSON expansion
- `SYMBOLIC-SUBSTITUTION-PRIMITIVE1` — structural carrier substitution
- `SYMBOLIC-FACTORIZATION-PRIMITIVE1` — product decomposition, rational patterns
- `SYMBOLIC-SIMPLIFICATION-PRIMITIVE1` — scalar folding, identity cleanup
- Elimination seam — bivariate Sylvester resultant, 12-degree projections

MathJSON readback routing milestone must land before any algorithm that
produces branch-heavy or nested-radical output. Finite roots and branch arrays
must carry MathJSON-backed expressions normalized through the simplification
primitive before readback. LaTeX string normalizer is last-mile polish only,
not the primary correctness mechanism.

---

## PHASE 1 — Polynomial Root Algorithms

### 1.1 Cardano (cubic exact symbolic)

**Dependency:** expansion primitive, substitution primitive, factorization
primitive, complex infrastructure, normalization routing.

**Algorithm:**
1. Rational root test first via factorization primitive. If a rational root
   exists, factor it out and reduce to quadratic. Do not run Cardano on a
   polynomial that factors cheaply.
2. Depression step: substitute `x = t - b/3a` using substitution primitive.
   Produces depressed cubic `t³ + pt + q = 0` where `p` and `q` are symbolic
   in original coefficients.
3. Discriminant: `Δ = -4p³ - 27q²`.
4. Cardano formula: `t = ∛(-q/2 + √(q²/4 + p³/27)) + ∛(-q/2 - √(q²/4 + p³/27))`
5. Three roots via cube roots of unity `ω = e^(2πi/3)`.
6. Back-substitute `x = t - b/3a`.
7. **Casus irreducibilis** (Δ > 0, three distinct real roots): requires complex
   intermediate arithmetic even though final answers are real. Complex
   infrastructure handles this. Do not treat this as a failure or numeric case.
8. Attach domain facts: denominator exclusions from `a ≠ 0`, discriminant sign
   fact, branch labels.
9. Symbolic coefficients mandatory: `at³ + bt² + ct + d = 0` with `a, b, c, d`
   as symbolic parameters must produce exact formulas in those parameters.
   Cardano is not complete until symbolic coefficient case passes.

**Verification:** golden corpus of cubics with known exact roots including
casus irreducibilis cases. Symbolic coefficient case: `x³ + px + q = 0`
returns Cardano formula in terms of `p` and `q`.

---

### 1.2 Ferrari (quartic exact symbolic)

**Dependency:** Cardano (1.1) — Ferrari calls Cardano internally for the
resolvent cubic. Do not start until Cardano is verified.

**Algorithm:**
1. Rational root test first. Reduce degree if possible.
2. Depression step: substitute `x = t - b/4a`. Produces `t⁴ + pt² + qt + r`.
3. Ferrari substitution: add parameter `m` to complete the square. Condition
   for right side to be perfect square produces the resolvent cubic in `m`.
4. Solve resolvent cubic via Cardano (sub-call).
5. With `m` known, factor quartic into two quadratics.
6. Solve each quadratic via quadratic formula.
7. Four roots with domain facts and branch conditions.
8. Symbolic coefficients mandatory: same requirement as Cardano.

**Verification:** golden corpus of quartics. Symbolic case: `x⁴ + ax² + b = 0`
(biquadratic special form) as a sanity check before full symbolic quartic.

---

### 1.3 Degree 5+ Special Forms

**Dependency:** Cardano and Ferrari verified. Build in this order — each reuses
the previous and shares infrastructure.

**1.3a Binomial** `ax^n + b = 0` — exact at any degree.
- `x = (-b/a)^(1/n)` times nth roots of unity `e^(2πik/n)`.
- Connects to existing complex special-form infrastructure (degree ≤ 12 already
  live). Extension to arbitrary degree is natural.
- ~100 lines.

**1.3b Trinomial / quadratic-in-disguise** `ax^(2k) + bx^k + c = 0`.
- Substitute `u = x^k`, produce quadratic in `u`, apply quadratic formula,
  then take kth roots of each solution.
- Your special-form carrier work already handles many cases. This is a direct
  generalization.
- ~150 lines.

**1.3c Rational roots plus degree reduction.**
- Rational root theorem: candidates are `±p/q` where `p | a₀` and `q | aₙ`.
- Test each candidate, factor out confirmed roots via factorization primitive,
  recurse on reduced polynomial.
- With Cardano and Ferrari available, any reduction to degree ≤ 4 yields an
  exact result.
- ~300 lines.

**1.3d Reciprocal/palindromic.**
- Coefficients symmetric: `ax⁴ + bx³ + cx² + bx + a = 0`.
- Divide by `x²`, substitute `u = x + 1/x`, note `x² + 1/x² = u² - 2`.
- Produces quadratic in `u`. For degree-5 palindromic: `x = -1` is always a
  root, factor first.
- ~150 lines.

**1.3e Composition forms.**
- Detect `f(g(x)) = 0` where `f` and `g` are polynomials of lower degree.
- Substitute `u = g(x)`, solve `f(u) = 0` for `u`, then solve `g(x) = uᵢ`
  for each root `uᵢ`.
- ~200 lines.

**1.3f Cyclotomic.**
- `x^n - 1 = 0` and irreducible cyclotomic factors.
- Roots are primitive nth roots of unity. Connects to complex infrastructure.
- ~150 lines.

**1.3g Durand-Kerner numeric fallback — expose as the honest named fallback.**
- Already partially in `polynomial-roots.ts` as Weierstrass method.
- Expose as the explicit fallback when no special form applies.
- Always attach the Abel-Ruffini message:
  *"Degree 5+ polynomials have no general closed-form solution (Abel-Ruffini,
  1824). Numeric roots shown."*
- Result clearly marked `solutionKind: 'approximate-numeric'`.
- ~100 lines additional wiring.

---

### 1.4 Multivariable Polynomial System Extension

**Dependency:** Cardano and Ferrari verified.

- `equation-polynomial-system.ts` and `EQUATION-ELIMINATION-FRONTIER1` already
  handle 2×2 systems via bivariate Sylvester resultant.
- Extension: 2×2 systems where each equation is up to degree 4 can be reduced
  to a univariate polynomial via resultant and then solved exactly by
  Cardano/Ferrari.
- 3×3 systems via sequential elimination.
- Symbolic parameter support throughout — variable-role system governs target
  vs parameter.
- Deferred: Gröbner basis (not part of this handoff).

---

## PHASE 2 — Parallel Families (no polynomial root dependency)

These four families are fully independent of Phase 1 and independent of each
other. They can be built in parallel with Phase 1 or among themselves. Each
delegates its resulting equation to whatever family handles it — including the
polynomial pipeline once Phase 1 lands.

### 2.1 Rational Equations — deepen routing

**What exists:** rational equation handling with target-in-denominator guidance.

**Extension:**
- Cross-multiply to produce a polynomial.
- Identify degree, route to the correct polynomial solver (linear → existing,
  quadratic → existing, cubic → Cardano, quartic → Ferrari, degree 5+ → special
  forms).
- With Phase 1 built, degree 3–4 cases that currently stop will complete
  automatically.
- This is routing work, not new algorithm work.
- Domain facts: denominator exclusions already tracked, preserve them.

---

### 2.2 Logarithmic Equations

**Algorithm:**
1. Single log: `ln(f(x)) = g(x)` → `f(x) = e^(g(x))`. Delegate.
2. Multiple logs via log laws (simplification primitive): `ln(f) + ln(g) = c`
   → `ln(fg) = c` → `fg = e^c`. Delegate.
3. Log base a: `log_a(f(x)) = g(x)` → `f(x) = a^(g(x))`. Delegate.
4. Mixed log and polynomial: collect log terms, apply inverse, delegate
   resulting equation.
5. Domain facts: argument of log must be positive — attach to Valid When.

**Notes:** no polynomial root dependency. Results after inversion are whatever
equation type they become. Symbolic parameters throughout.

---

### 2.3 Absolute Value Equations

**Algorithm:**
1. `|f(x)| = c` where `c ≥ 0`: split into `f(x) = c` and `f(x) = -c`.
   Solve each, union results, validate `c ≥ 0` as domain fact.
2. `|f(x)| = g(x)`: split into `f(x) = g(x)` and `f(x) = -g(x)`.
   Validate `g(x) ≥ 0` at each solution.
3. `|f(x)| = |g(x)|`: split into `f(x) = g(x)` and `f(x) = -g(x)`.
4. Nested absolutes: peel outermost first, recurse on inner.
5. Each branch delegates to whatever equation family the inner equation is.
6. Candidate validation mandatory: check the original absolute value holds at
   each proposed solution.

**Notes:** no polynomial root dependency. Purely a case-split and delegation
mechanism.

---

### 2.4 Exponential Equations

**What exists:** parameterized exp/log family already handles core cases.

**Extension:**
1. `a^(f(x)) = b^(g(x))`: take log of both sides, rearrange, delegate.
2. `e^(2x) - 3e^x + 2 = 0`: polynomial-in-disguise via `u = e^x`. Substitute,
   solve quadratic in `u`, apply `ln` to each valid root.
3. General polynomial-in-exponential `P(e^x) = 0`: substitute `u = e^x`,
   solve polynomial in `u` via polynomial pipeline, back-substitute.
4. Domain facts: base of exponential must be positive and ≠ 1.

**Notes:** polynomial-in-disguise cases delegate to the polynomial pipeline
after substitution. Phase 1 polynomial solvers extend these automatically.

---

## PHASE 3 — Polynomial-Dependent Transcendental Families

**Dependency:** Phase 1 polynomial pipeline solid and verified. Build after
Phase 1 is confirmed correct across numeric and symbolic cases.

### 3.1 Trigonometric Equations — extend beyond existing

**What exists:** `sin(x) = c`, `cos(x) = c`, `tan(x) = c` with periodic
families. Already working.

**Extension:**

**Trig polynomial equations (needs Cardano/Ferrari):**
- `P(sin(x)) = 0` or `P(cos(x)) = 0` for degree 2–4 polynomial `P`.
- Substitute `u = sin(x)` or `u = cos(x)`.
- Solve `P(u) = 0` via polynomial pipeline (quadratic → existing,
  cubic → Cardano, quartic → Ferrari).
- For each valid root `u` where `|u| ≤ 1`: apply `arcsin`/`arccos` and
  generate periodic family.
- For roots with `|u| > 1`: no real solution from that branch, but complex
  mode gives `arcsin(u)` in complex form.
- Example: `2sin²(x) - sin(x) - 1 = 0` → `u = sin(x)`, quadratic.
- Example: `2cos³(x) - cos(x) = 0` → `u = cos(x)`, cubic → Cardano.

**Trig composition and identity cases:**
- `sin(2x) = cos(x)` → expand via double-angle, rearrange, polynomial in
  `sin(x)` or `cos(x)`.
- `sin(x)cos(x) = c` → half-angle identity → `sin(2x) = 2c`.
- Trig simplification rule table drives the identity reductions before
  polynomial solving.

**Periodic family generation:**
- Each valid root of the polynomial produces a periodic family.
- For `sin(x) = v`: `x = arcsin(v) + 2kπ` and `x = π - arcsin(v) + 2kπ`.
- For `cos(x) = v`: `x = ±arccos(v) + 2kπ`.
- For `tan(x) = v`: `x = arctan(v) + kπ`.
- Multiple polynomial roots produce multiple independent periodic families.
- Display cap: periodic families shown for `k ∈ {-1, 0, 1}` by default with
  explicit formula, not expanded.

---

### 3.2 Radical / Radicand Equations

**Dependency:** Phase 1 polynomial pipeline. Squaring/cubing radicals produces
polynomials that need Cardano/Ferrari for complete coverage.

**Algorithm:**

**Single radical:**
- `√(f(x)) = g(x)`: square both sides → `f(x) = g²(x)`.
- Solve resulting polynomial. Validate candidates: `g(x) ≥ 0` required.
- Domain fact: radicand `f(x) ≥ 0`.
- Degree after squaring: if `g(x)` is degree n, result is degree 2n.
  Linear `g(x)` → quadratic (existing). Quadratic `g(x)` → quartic (Ferrari).

**Cube root:**
- `∛(f(x)) = g(x)`: cube both sides → `f(x) = g³(x)`.
- If `g` is linear: degree 3 → Cardano.
- If `g` is quadratic: degree 6 → trinomial special form if reducible,
  Durand-Kerner numeric if not.

**Two radicals:**
- `√(f(x)) + √(g(x)) = c`:
  1. Isolate one radical: `√(f(x)) = c - √(g(x))`.
  2. Square: `f(x) = c² - 2c√(g(x)) + g(x)`.
  3. Isolate remaining radical: `2c√(g(x)) = c² + g(x) - f(x)`.
  4. Square again. Result is degree 4 polynomial → Ferrari.
  5. Validate all candidates in the original equation — double squaring
     introduces extraneous roots aggressively.

**Nested radicals:**
- Peel outermost radical using existing peeling mechanism.
- Each peel produces a polynomial. Route through polynomial pipeline.

**Candidate validation mandatory for all radical cases.** Your candidate
validation infrastructure handles this. Never skip it.

---

## Symbolic Coefficient Requirement (applies to every algorithm above)

Every algorithm in this handoff is incomplete until it handles fully symbolic
coefficients. This means:

- Cardano with `a, b, c, d` as symbolic parameters → formula in those parameters.
- Trig polynomial with `a, b, c` symbolic → result expressed in those parameters.
- Radical equation with symbolic right-hand side → symbolic result.

The variable-role system (solve-target vs symbolic-parameter) governs this
automatically. The parameterized equation architecture is already built for it.
Symbolic coefficient coverage is not a stretch goal — it is a correctness
requirement.

---

## Parallel Build Map

```
Phase 1 (polynomial)          Phase 2 (no polynomial dependency)
────────────────────          ─────────────────────────────────
Cardano           ←──┐        Rational deepening (routing only)
Ferrari           ←──┘        Logarithmic equations
Binomial (5+)                 Absolute value equations
Trinomial (5+)                Exponential equations
Rational roots (5+)
Palindromic (5+)              All four can run simultaneously
Composition (5+)              with each other and with Phase 1.
Cyclotomic (5+)
Durand-Kerner fallback

Phase 3 (after Phase 1 solid)
──────────────────────────────
Trig polynomial equations     ← needs Cardano/Ferrari beneath
Radical/radicand equations    ← needs Cardano/Ferrari beneath
Two-radical equations         ← needs Ferrari specifically
```

---

## What is explicitly out of scope for this handoff

- Integration pipeline (Rubi, Risch, Euler substitutions, etc.)
- Differentiation workspace
- Series and sequences
- Linear algebra
- ODE / PDE
- Gröbner basis
- Graphing
- Step-by-step display engine
- Rust migration of any symbolic component
- Surface protocol / embedding layer
- Profiling / grade-adaptive UI

None of these block anything in this handoff. None should be started as part
of this handoff.

---

## The single rule to check before each milestone

Before implementing any algorithm: is everything this reads from already stable?
Cardano reads the expansion and substitution primitives — both stable. Ferrari
reads Cardano — must be stable before Ferrari starts. Trig polynomial equations
read the Cardano/Ferrari polynomial pipeline — must be stable before Phase 3
starts. Phase 2 families read only existing infrastructure — can start any time.
