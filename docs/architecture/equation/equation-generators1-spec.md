# EQUATION-GENERATORS1 — Exponential, Logarithmic and Lambert-W Decisions (slice 2)

Date: 2026-10-03
Status: implemented and backend-verified on 2026-10-03; private, no production caller.
Gate: backend only. Stage 6 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: [`EQUATION-POLYNOMIAL-DECISION1`](equation-polynomial-decision1-spec.md) and every earlier gate. No dependency, schema, workspace or production caller is added.

## Outcome

Over ℝ, the slice exactly decides equations, inequalities and conjunctions in one target that involve:
- exp;
- log;
- powers with the target in the exponent;
- Lambert W.

Answers are exact closed forms such as ln 2, 2·ln 2, e^{∛4}, e^{e^e}, W₀(1) and ±√(e−1), or proven empty sets. Every answer comes with a replayable proof log and an independent verifier.

User decisions (2026-10-03):
- ℝ only; complex exp/log moves to `EQUATION-PERIODIC1`;
- inequalities and conjunctions included;
- the full canonical Lambert class, with exact branches and exact simplification;
- nested exp/log chains included (C6/C7 move here from composition);
- inner equations with a transcendental level are solved up to degree 2;
- transcendental generator coefficients: shifts are absorbed, otherwise degree 1 only.

## Exactness model

Every sign or order question about a closed form is answered in two steps. Exact evaluation is tried first (algebraic values via RootOf). Otherwise certified rational enclosures are refined, doubling the precision under the budget only. This terminates for every nonzero value.

Nonzero-ness follows from:
- **Lindemann–Weierstrass / Hermite–Lindemann**: e^a and ln a are transcendental for algebraic a ≠ 0, 1. So W(a) is transcendental for algebraic a ≠ 0, and algebraic values never equal −1/e;
- **Gelfond–Schneider**: ln a/ln b is rational or transcendental;
- **Baker**: for ℚ-independent ln b₁ … ln bₘ, the values 1, ln b₁ … ln bₘ are linearly independent over the algebraic numbers. This gives exact equality and proportionality of log-linear constants over a coprime base;
- **Completeness of zero lists**: each atom's zero list is complete by construction. So its sign at a sample strictly between zeros, or at another atom's zero that is not in its own list, is nonzero.

**One case rests on a conjecture.** The Lambert threshold K vs −1/e with K = R·ln b would fail to separate only if e·ln b were rational. That is not proven impossible (Schanuel-type). There, refinement runs under the budget and can only end in a typed `resource` stop. It never produces a wrong answer and never hits a precision cap.

**Real power convention.** Over ℝ, a power whose exponent depends on the target is defined only where its base is positive, as in real analysis. A negative constant base with a variable exponent is refused rather than given a pointwise reading.

## Implemented contracts

### Substrate

- **`algebra/integer.ts`**:
  - `iroot` gives exact floor k-th roots; when k ≥ bit length the root is 1, so a huge index costs nothing;
  - `perfectPower` is bounded by bit length.
- **`representation/expression.ts`**: new real-branch functions `lambertw` (W₀) and `lambertwm1` (W₋₁). The new number-only folds all preserve value and domain:
  - log q becomes m·log r for rational q > 0, with r > 1 not a perfect power (log(1/q) = −log q);
  - log(q^c) becomes c·log q, exp(c·log q) becomes q^c, and log(exp c) becomes c for real c;
  - exp(a)·exp(b) becomes exp(a+b);
  - (c·A)ⁿ becomes cⁿ·Aⁿ;
  - exponents merge for never-zero bases, so ln 8/ln 2 = 3;
  - q^{m/k} is exact for perfect powers;
  - W(s·eˢ) becomes s on the matching branch.

  A number-only expression that is real by construction counts as total, so 0·ln 2 = 0. x/x and 0·log x are still never cancelled.
- **`representation/evaluate.ts`**: W(0) = 0. W of a nonzero algebraic number is transcendental, and undefined outside its real domain.
- **`representation/mathjson.ts`**: reads and writes `["LambertW", z]` and `["LambertW", z, -1]`.
- **`representation/enclosure.ts`**: certified rational-interval enclosures for:
  - π (Machin);
  - exp (Taylor with halving and squaring);
  - log (atanh with 2-power reduction);
  - W₀/W₋₁ (Newton from a certified bracket, re-certified; bisection fallback; stopping when a step fails to contract, with no iteration cap);
  - rational and integer powers (exact integer roots below a measured crossover, exp/log above it);
  - real algebraic numbers.
- **`representation/real-order.ts`**: exact signs and comparisons.
- **`representation/solution-set.ts`**: closed-form values are ordered numerically, and interval endpoints may be closed forms.

### Slice (`core/generators/`)

- **`constants.ts`**: log-linear constants q₀ + Σ cᵢ·ln rᵢ. A coprime base comes from gcd splitting, with no factoring. Coordinates decide zero, equality and rational ratios. Numeric factors distribute over sums.
- **`normal-form.ts`** has two rules with checkers:
  - `log-domain` (`EQUIVALENT_UNDER_CONDITIONS`) adds log v ⇒ v > 0, f^g ⇒ f > 0, W₀(v) ⇒ v ≥ −1/e, and W₋₁(v) ⇒ v ≥ −1/e and −v > 0;
  - `real-power-normal-form` (`EQUIVALENT` over ℝ) rewrites a^u → exp(u·log a), exp(u)^w → exp(u·w), log(exp u) → u, and exp(log v) → v once v > 0 is recorded. Rewritten conditions are recorded as removed and added.
- **`lattice.ts`**:
  - kernel scan;
  - the exponent lattice: rational ratios decided exactly, giving integer powers nᵢ, the generator t = exp(G + γ), and a shift γ that makes the coefficients algebraic when possible;
  - log arguments factored over ℚ;
  - sparse bivariate expansion in (x, t).
- **`inversion.ts`**: the zero finder. It runs a goal worklist with an explicit stack:
  - rational goals: exact polynomial roots at any degree; with transcendental levels, degree 1, or degree 2 via radicals with a certified sign;
  - single-kernel inversion (exp, log, W₀, W₋₁) with range conditions;
  - lattice substitution;
  - log classes: one factor (|f| = e^y, then f = ±e^y), or several combined linearly with rational coefficients (exponentiated to |P| = K);
  - routing of the variable-outside cases to Lambert;
  - fresh placeholder names per call.
- **`lambert.ts`**: (ax+b)ⁿ·e^{cx+d} = k, with real n-th roots, gives u·eᵘ = K. Branches:
  - K > 0 → W₀;
  - K = 0 → 0;
  - K = −1/e → −1 (structural);
  - −1/e < K < 0 → W₀ and W₋₁;
  - otherwise none.

  Exact simplification: K = R·ln b gives s = m·ln b with m·b^m = R. An integer search, exact and finite by monotonicity, settles it, and s ≥ −1 picks the branch. The log class reduces through x = ±e^ξ.
- **`closed-form-set.ts`**: the 1-D decomposition with closed-form critical points sorted numerically. Conditions are evaluated first, innermost first. The sample in each gap is the rational with the smallest denominator (continued fractions).
- **`solve.ts`**: the pipeline log-domain → normal form → log-domain → natural-domain → move-to-zero, then the leaf decision.
- **`verify.ts`**:
  - replay with the slice rules;
  - one final-form leaf;
  - re-derivation compared by canonical keys;
  - evidence: equation residuals contain 0 at 192 bits, each interval sample satisfies all atoms and each gap sample fails, and every value (including each W) is a defined real.
- **`core/decide.ts`**: `decideEquation` and `verifyEquationOutcome` send target-dependent exp/log/W/variable-exponent problems to this slice and everything else to slice 1.

## Acceptance evidence

`node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 21 files / 224 tests pass (61 new). Reference digits come from Python mpmath; it is never a runtime dependency.

**Corpus.**

| Case | Result |
| --- | --- |
| E1 | {ln 2, ln 3} (the old engine refused it) |
| E2 | {0, ln 2} |
| E3 | {2·ln 2} |
| E4 | {0, ln 2} |
| E5 | {1} |
| E6 | {e, e², e³} |
| E7 | {e, e^{∛4}} |
| E8 | {W₀(1)} |
| E9 | empty |
| C6, C7 | the identical id e^{e^e} |

The old engine gave decimals for E2–E8 and C6/C7. Two depth-25 chains are solved by the same code.

**Convergence.**
- 4ˣ = 8 and 2^{2x} = 8 both give {3/2}.
- e^{2x} = 4 gives {ln 2}.
- (eˣ)² = 4 matches eˣ = 2.
- log₂ x = 3 gives {8}.
- e^{x+ln 2} = 6 gives {ln 3}.

**Logs.**
- ln x + ln(x+1) = ln 6 gives {2}; −3 is excluded by the domain.
- ln(x²) = 2 gives {−e, e}.
- ln(x²+1) = 1 gives ±√(e−1).
- ln(x−1) = 0, ln x = −ln x, and ln x − ln x² = 1 gives {e⁻¹}.

**Transcendental coefficients.** e^{x+1} + eˣ = 3 gives {ln(3/(1+e))}. e^{2x+2} − 3e^{x+1} + 2 = 0 gives {−1, ln 2 − 1}.

**Lambert.**
- x·eˣ = −1/(2e) gives both branches.
- x·eˣ = −1/e gives {−1}.
- x·eˣ = −1 is empty.
- 2ˣ = x+1 gives exactly {0, 1}.
- x ln x = 2 ln 2 gives {2}.
- x^x = 27 gives {3}.
- ln x = x−1 gives {1}.
- (x+1)e^{x+1} = e gives {0}.
- x²eˣ = 1 gives {2·W₀(1/2)}.

**Inequalities.**
- eˣ > 2 gives (ln 2, ∞).
- ln x ≤ 1 gives (0, e].
- 2ˣ + 4ˣ < 6 gives (−∞, 1).
- x·eˣ < 1 gives (−∞, W₀(1)).
- ln ln x > 0 gives (e, ∞).
- eˣ ≥ x+1 gives ℝ, and eˣ > x+1 gives ℝ∖{0}.
- ln x ≠ 0.
- A conjunction.

**Routing.**
- 2ˣ + 3ˣ = 5 and eˣ + ln x = 1 name `EQUATION-CERTIFIED-NUMERICS1`.
- e^{2x} + eˣ = e and ln(x³+x) = 1 name `EQUATION-PARAMETERS1`.
- e^{|x|}, e^{√x} and e^{sin x} keep their owners.
- a·eˣ names the parameters gate.
- Complex eˣ = 2 names `EQUATION-PERIODIC1`.
- x² = 2 still goes to slice 1.

**Substrate.**
- iroot/perfectPower laws.
- Folds.
- LambertW through MathJSON and the wire.
- Enclosures of e, π, ln 2, e^{e^e}, W₀(1), W₋₁ and W₀ at −1/(2e), and e^{∛4} against mpmath.
- Seeded soundness: log(exp q) ∋ q, exp(log q) ∋ q, W(q·e^q) ∋ q.
- Exact ordering, e.g. e^π > π^e.
- The coprime base and log-linear dependence.
- The integer search for m·bᵐ = R.

**Verifier.** Rejects:
- a perturbed or missing closed form;
- a wrong W branch;
- a moved interval endpoint or wrong closedness;
- a log missing its domain step;
- a tampered measure;
- a foreign proof.

Wire replay of e^{∛4}, both W branches and an interval verifies.

**Resources.** Typed `work` and `cancelled` outcomes.

TypeScript, ESLint, compartment and OOE boundaries, file sizes, the isolation test and the no-caps ratchet pass.

## Bugs found during the gate

- **Memory blow-up.** Gap samples were dyadic midpoints with 2³² denominators. Evaluating 2^{sample} then built exact roots of degree 2³², allocating memory faster than the work budget could stop it. The fix: gap samples are now the simplest rational, and powers with large root indices are enclosed through exp/log above the crossover.
- **0⁰.** A Lambert form check produced 0⁰ (s⁰ with s = 0). It now uses 1 for zero exponents.

## Known follow-ups (not caps)

- Presentation: −(1 − e) is not distributed to e − 1, and square factors under radicals are kept. These belong to the result contract and the printer.
- Two different closed forms of the same value could only be ordered by refinement under the budget. Canonical log forms and single-family solution construction keep this from arising in the slice's own outputs.
- Wider W simplification (several log bases in K) and algebraic bases with non-binomial minimal polynomials in the lattice are future upgrades.

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
