# EQUATION-POLYNOMIAL-DECISION1 — Polynomial Decision Specification (slice 1)

Date: 2026-10-03
Status: implemented and backend-verified on 2026-10-03; private, with no production caller.
Gate: backend only. Stage 5 of the [roadmap](equation-reconstruction-roadmap.md), and the first solving slice.

Dependencies:
- [`EQUATION-EXACT-ALGEBRA1`](equation-exact-algebra1-spec.md);
- [`EQUATION-ALGEBRAIC-NUMBERS1`](equation-algebraic-numbers1-spec.md);
- [`EQUATION-REPRESENTATION1`](equation-representation1-spec.md).

No dependency, schema, workspace or production caller is added.

## Outcome

The slice decides, exactly, conjunctions of univariate polynomial and rational relations over ℝ or ℂ:
- relations =, ≠, <, ≤, > and ≥;
- problem conditions: nonzero, positive, nonnegative, equal and not-equal.

Coefficients may be rational or numeric algebraic, for example √2, i, ∛5 or a RootOf. Each answer is one of:
- an exact solution set: a finite set, real interval unions, or "all except finitely many";
- `empty` with a proof;
- an honest refusal that names the gate owning the problem.

Every positive or empty answer carries a proof log that an independent verifier replays.

User decisions (2026-10-03):
- include inequalities and conjunctions;
- accept rational and algebraic coefficients;
- attach proven radical forms for quadratic factors and pure binomials.

## Implemented contracts

All new code is under `src/lib/symbolic-engine/equation/core/decision/`.

### Recognition (`rational-form.ts`)

An explicit-stack walk turns an expression into a rational function n/d of the single target.
- Number-only subgraphs are coefficients.
- Sums, products and integer powers of target-dependent parts become polynomial arithmetic.
- Purely rational forms use ℚ[x], with Karatsuba multiplication and exact gcd cancellation; the denominator is kept monic, so signs are preserved.
- Otherwise coefficients stay number-only expressions and are evaluated exactly once at the end.
- A non-positive power of an expression that is identically zero is "defined nowhere".

Refusals, as `incomplete-implementation`, name the owning gate:
- `EQUATION-CONSTRAINTS1`: radicals and abs of the target;
- `EQUATION-GENERATORS1`: exp and log of the target, and the target in an exponent;
- `EQUATION-PERIODIC1`: trig functions of the target;
- `EQUATION-PARAMETERS1`: other symbols and transcendental coefficients such as π;
- `EQUATION-SYSTEMS1`: several targets.

Order conditions over ℂ are `unsupported`.

### Transforms (`rules.ts`)

Each rule has a checker that re-derives its step.
- **`natural-domain`.** Every base raised to an integer power ≤ 0 must be nonzero. This covers 1/x, nested 1/(1/x) and x⁰. The step adds those conditions and is `EQUIVALENT_UNDER_CONDITIONS`.
- **`move-to-zero`.** The existing rule from the representation gate.
- **`to-polynomial`.** For e = n/d, `e op 0` becomes `n op 0` for = and ≠, and `n·d op 0` for order relations. The step is `EQUIVALENT`, and it applies only once every denominator is covered by a recorded condition.

The pipeline is natural-domain → move-to-zero → natural-domain → to-polynomial. This slice has no `FORWARD_ONLY` step.

### Leaf decision (`univariate.ts`, `real-set.ts`)

Every relation and condition becomes an atom `P op 0`.

**Zeros.**
- Rational P: factorization over ℚ, then the canonical root catalog (ℝ: real roots only).
- Algebraic P (`algebraic-coefficients.ts`):
  1. Compute the norm N(x) = det(Σ xⁱ·M(cᵢ)). The M(cᵢ) are Kronecker companion matrices on ⊗ ℚ[z]/(mₖ) over the distinct coefficient generators. N is found by Bareiss determinants at deg + 1 points followed by exact interpolation, and N ≢ 0 whenever P ≢ 0.
  2. Candidate roots of N are rejected by certified disk evaluation where possible.
  3. Every survivor is confirmed exactly with RootOf arithmetic.

**ℝ.** Critical points are the zeros of all atoms, sorted. The sign of each atom is exact:
- at each critical point, by `signAtReal`, or by disk-then-exact evaluation for algebraic P;
- on each open piece, at one rational sample point.

True pieces merge into a canonical interval union. An all-point result is reported as a finite set.

**ℂ.** If there is an equation, the zeros of the lowest-degree one are filtered by every atom (minimal-polynomial divisibility, or exact evaluation). Otherwise the result is cofinite: the domain minus the zeros of the ≠ atoms.

**Empty answers are proven, never a failed search:**
- a nonzero constant;
- no isolated roots (isolation with a Sturm cross-check);
- every root excluded;
- an empty intersection;
- a relation that is defined nowhere.

### Radical forms (`radical-forms.ts`)

Forms are attached for:
- quadratic factors: (−b ± √(b²−4ac))/(2a), or ±√(−c/a) when b = 0;
- real roots of binomials a·xⁿ − b: ±(b/a)^(1/n).

A form is attached only when `evaluateExact` proves it is the same root, and the verifier rechecks it. The RootOf stays the identity. Other algebraic values stay RootOf.

### Orchestration and verification (`solve.ts`, `verify.ts`)

**`decidePolynomialProblem`.**
- Refuses before any rewriting when the slice does not own the problem.
- Rewrites, decides the leaf, and returns a normalized set or `empty`, with the log.
- Resource stops become the `resource` outcome.

**`verifyOutcome`.**
- The log starts at the problem and replays through `verifyProofLog` with the slice rules.
- There is exactly one leaf, already in final form.
- Re-deciding the leaf gives the same canonical set (or empty).
- Every finite point satisfies every atom exactly.
- Every radical form evaluates to its root.

### Representation additions

- New set kinds:
  - `intervals`: real, sorted, disjoint and non-touching, with exact endpoints, ±∞, and open/closed flags. Normalization merges overlaps and touching intervals.
  - `cofinite`: the domain minus finitely many points.
- An optional proven `form` on algebraic point values. It is outside identity keys and is carried by the wire.

## Acceptance evidence

`node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 18 files / 163 tests pass (the decision slice adds 2 files and 50 tests, plus 2 representation tests). Reference decimals come from Python mpmath.

**Corpus P1–P11 over ℝ, exact:**
- P3 = {−3, −1, 1, 3};
- P4 = {RootOf ≈ 1.167304};
- P5 = {2^{1/5}} with a proven form;
- P8 = {−2, 1};
- P9 = three RootOf;
- P11 = {9^{1/9}}.

The old engine approximated P4 and P9 only.

**R1–R3.**
- R1 is empty (x = 1 excluded).
- R2 = (1 ± √5)/2 with proven forms.
- R3 is empty with a proof (natural-domain, then to-polynomial). The old engine mislabelled it.

**ℂ.** x⁶ − 1 and x⁵ − 1 give all their roots; x² + 1 gives ±i with forms; x⁵ − x − 1 gives 1 real and 4 non-real roots.

**Domains and identities.**
- 1/(1/x) = 0 is empty.
- x⁰ = 1 and x/x = 1 give ℝ∖{0}.
- (x²−1)/(x−1) = x+1 gives ℝ∖{1}, and ℂ∖{1} over ℂ.
- 0·x = 0 gives ℝ.
- 2 = 3 and x² + 1 = 0 over ℝ are empty.

**Inequalities and conjunctions.**
- x² < 2 gives (−√2, √2), and x² ≤ 2 gives the closed interval.
- (x−1)/(x+2) ≥ 0 gives (−∞, −2) ∪ [1, ∞).
- x⁵ − x − 1 > 0 gives (RootOf, ∞).
- x² ≠ 4, and (x−1)² ≤ 0 = {1}.
- 1/x > 1 gives (0, 1).
- x² = 4 ∧ x > 0 gives {2}.
- 0 < x < 3 ∧ x ≠ 1.
- A problem condition: x⁴ = 16 with `positive(x)` gives {2}.

**Algebraic coefficients.**
- √2·x² = 3 gives ±(9/2)^{1/4}.
- x² − (√2+√3)x + √6 = 0 gives {√2, √3} with forms.
- i·x = 1 gives −i over ℂ and is empty over ℝ.
- x³ = ∛2 gives 2^{1/9}.
- (√8 − 2√2)·x = 1 is empty, and the same coefficient with right-hand side 0 gives ℝ.
- √2·x < 1.

**Scale.**
- ∏_{k=1}^{100}(x − k) = 0 gives 100 exact roots.
- ∏_{k=1}^{50}(x − k) < 0 gives 25 intervals.
- A random dense degree-50 polynomial gives every real root, matching an independent Sturm count.
- x²⁰ = 1 over ℂ gives 20 roots.

**Routing.** sin x, eˣ, 2ˣ, √x, |x|, a·x and π·x each name their owning gate.

**Verifier rejects:**
- added, removed and duplicated points;
- a claimed empty set that has solutions, and claimed solutions for an empty problem;
- a forged radical form;
- wrong interval closedness at a root and at a pole;
- a log missing the exclusion step, a forged record origin and a tampered measure;
- a proof from another problem.

**Replay.** Outcomes round-trip through the wire and the replay verifies.

**Resources.** Tiny budgets give `{kind: 'resource', stop: 'work'}` and `'cancelled'`; default budgets solve the same case.

TypeScript, scoped ESLint, compartment and OOE boundaries, file sizes, the isolation test and the no-caps ratchet pass.

## Bug found during the gate

`polynomialExpression` first wrote the constant term as c·x⁰. Because x⁰ is deliberately not simplified, that silently added the condition x ≠ 0. The verifier rejected the resulting leaves ("not in final polynomial form"). The constant and linear terms are now written as c and c·x.

## Known follow-ups (not caps)

- Non-real points are ordered by canonical identity, not numerically. Display order belongs to the result contract.
- Radical forms keep √D unsimplified (½·√8 rather than √2 when b ≠ 0). Square-factor extraction belongs to presentation, so the decision never depends on integer factoring.
- Principal roots of negative numbers above square roots, as coefficients over ℂ, stay `incomplete-implementation` until slice 3, as recorded in the representation gate.

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
