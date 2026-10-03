# EQUATION-CONSTRAINTS1 — Absolute Values and Real Radicals (slice 3)

Date: 2026-10-03
Status: implemented and backend-verified on 2026-10-03; private, no production caller.
Gate: backend only. Stage 7 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: [`EQUATION-GENERATORS1`](equation-generators1-spec.md) and every earlier gate. No dependency, schema, workspace or production caller is added.

## Outcome

Over ℝ, the core now exactly decides equations, inequalities and conjunctions in one target that involve:
- absolute values, nested at any depth;
- real radicals v^{p/q}, of one base or of several bases, nested at any depth;
- either of these mixed with the exp/log/Lambert-W kernels of slice 2.

Answers are exact: rationals, RootOf values (with a proven radical form when one exists), closed forms such as ±ln 2 or (ln 2)², intervals (|x| = x is [0, ∞)), or proven empty sets. Every answer comes with a replayable proof log and an independent verifier.

User decisions (2026-10-03):
- **ℝ only.** Complex modulus and complex radicals are `unsupported`, as noted in the roadmap.
- **Full radicals.** Same-base lattice, multi-base elimination and nested towers, with every candidate checked exactly.
- **Range contractors (HC4) move to `EQUATION-COMPOSITION1`.** Completeness here comes from exact zero sets, not from contraction.
- **Mixing with slice 2 is included**, but radical elimination itself stays algebraic: √x + eˣ = 3 is refused, naming `EQUATION-CERTIFIED-NUMERICS1`.
- Inequalities and conjunctions are covered as in slices 1–2.

## Semantics (ℝ)

- v^{p/q} with p/q reduced is (the real q-th root of v)^p. It is defined for v ≥ 0 when q is even and for every v when q is odd, with v ≠ 0 when p < 0. This matches `evaluateExact` and the enclosures.
- |v| is total.
- An atom's zero set is a finite set of points plus intervals on which the atom vanishes wherever it is defined. Conditions are evaluated first, so the "wherever defined" reading is exact.

## Implemented contracts

### Substrate

- **`representation/expression.ts`**: (c·A)^r → c^r·A^r for a positive number c and rational r. It preserves value and domain over ℝ and ℂ, so √(4x) = 2√x and many dependent radicals disappear at construction.
- **`generators/normal-form.ts`**: `real-power-normal-form` gains three real rewrites, all value- and domain-preserving:
  - (eᵘ)^r → e^{r·u} for rational r;
  - (uⁿ)^{1/n} → |u| for even n, and u for odd n;
  - |u|^{2k} → u^{2k}.

  `step` and `replay` are exported for the new rule.
- **`representation/real-order.ts`**: `exactSign` is exported for the verifier.
- **`algebraic/complex-roots.ts`** (bug fix): the double-precision Aberth seeding converted tiny approximations through 2^{52−e}, which overflows to ∞ below about 2⁻⁹⁷¹, and crashed with a `RangeError`. It now divides by the exact power of two, and non-finite seeds fall back to the standard starts. Seeds are heuristic only; certification is unchanged.

### Slice (`core/constraints/`)

- **`normal-form.ts`**: the `radical-domain` rule (`EQUIVALENT_UNDER_CONDITIONS`). An even root u^{p/q} adds u ≥ 0 and a negative exponent adds u ≠ 0. Measure: missing radical-domain conditions.
- **`radicals.ts`**:
  - **Inversion.** v^{p/q} = c takes the real |p|-th roots s of c (of 1/c when p < 0), keeps s ≥ 0 when q is even, and gives v = s^q.
  - **Same-base lattice.** Radicals of one base v become integer powers of τ = v^{1/L}, where L is the lcm of the root indices and τ ≥ 0 when L is even. When the target also appears outside the radicals, v must be affine with an exact nonzero slope, and then x = (τ^L − b)/a. Each admissible root c gives the goal v = c^L. Every step is an equivalence.
- **`piecewise.ts`**: lazy abs branching.
  - Critical points are the zeros of the outermost abs arguments and of those arguments' domain boundaries (even-radical and negative-power bases, log arguments, Lambert thresholds), each found recursively by the zero finder.
  - On each piece every |vⱼ| becomes σⱼ·vⱼ, with the sign read at one simple rational sample; it is 0 inside an argument's own zero interval.
  - A piece's zeros are kept only strictly inside the piece. A piece whose formula vanishes identically becomes a zero interval.
  - At a critical point, the adjacent piece formula decides, else exact evaluation.
  - Branches exist only where an argument changes sign.
- **`tower.ts`**: sparse polynomials over ℚ in x and generators w₁…wₖ. f becomes N/D with a triangular monic tower:
  - a radical base B = a/b with lcm index L gets w^L = a·b^{L−1} and B^{1/L} = w/b;
  - an algebraic constant gets its minimal polynomial.

  N ≡ 0 modulo the tower means zero wherever defined; D ≡ 0 means defined nowhere.
- **`elimination.ts`**: the norm R(x) = det of multiplication by N on ℚ[x][w]/(tower).
  - R is the product of N over all assignments of the tower's roots, so every real zero (the real-branch assignment) is a root of R.
  - The matrix entries are polynomials in x, so deg R ≤ Σ over columns of the maximum entry degree. R is evaluated at that many integer points plus one (Bareiss over ℚ) and interpolated exactly.
  - Each real root of R is kept only when exact evaluation of f there is 0. Points outside the domain and nonzero values are dropped.
  - R ≡ 0 with N ≢ 0 (dependent radicals) is refused.
  - A transcendental constant or kernel inside the tower names `EQUATION-CERTIFIED-NUMERICS1`.

### Engine changes (`core/generators/`)

- **`inversion.ts`**: `ZeroResult` gains zero intervals. The goal worklist tries, in order:
  1. a single kernel → inversion (exp, log, W₀, W₋₁, now also |·| and radicals);
  2. abs anywhere → piecewise;
  3. radicals only → same-base lattice, else tower elimination;
  4. exp/log as in slice 2;
  5. otherwise a refusal.

  At the top goal an identity is "zero wherever defined" (0·√x = 0 gives [0, ∞)). Zero intervals behind a substitution are refused. Placeholder names are shared with nested calls.
- **`samples.ts`**: simple rational samples (continued fractions), split out of the decomposition and shared with abs branching.
- **`closed-form-set.ts`**:
  - zero-interval endpoints are critical points;
  - an atom's sign is 0 at its points and inside its zero intervals, so an identically zero piece is never refined;
  - numerically equal critical points with different ids are merged.
- **`solve.ts`**: the pipeline is log-domain → normal form → log-domain → radical-domain → natural-domain → move-to-zero.
- **`verify.ts`**: independent evidence now runs before re-derivation. Every claimed point, closed endpoint and interval sample is substituted into the **original** relations:
  - an algebraic value must satisfy each relation exactly;
  - an undefined value fails;
  - a transcendental value must leave each equation's 192-bit residual containing 0.

  So a spurious radical candidate or a wrong zero interval is rejected without trusting the zero finder.
- **`core/decide.ts`**: target-dependent abs or non-integer rational powers go to the closed-form engine over ℝ, and are `unsupported` over ℂ.

## Acceptance evidence

`node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 23 files / 275 tests pass (52 new). Reference digits come from Python mpmath; it is never a runtime dependency.

**Corpus.**

| Case | Result | Old engine |
| --- | --- | --- |
| A1 \|x−1\| = 3 | {−2, 4} | exact |
| A2 \|\|x−1\|−2\| = 3 | {−4, 6} | **false "no roots"** |
| A3 \|\|\|\|x\|−1\|−2\|−3\| = 1 | {±1, ±5, ±7} | **false "no roots"** |
| A4 \|x−1\| + \|x+2\| = 5 | {−3, 2} | exact |
| S1 √(x+1) = x−2 | {(5+√13)/2} with a proven form; (5−√13)/2 rejected | exact |
| S2 √x + √(x+1) = 3 | {16/9} (tower elimination) | exact |
| S3 ∛x + √x = 2 | {1} (same-base lattice) | exact |
| S4 √x + √(x+1) + √(x+2) = 5 | one RootOf, 1.838601166658565639682409230952… (30 digits = mpmath) | refused |
| M1 √x + ∛x + ∜x = 3 | {1} (τ⁶ + τ⁴ + τ³ = 3, x = τ¹²) | refused |

**Absolute values.**
- |x| = x gives [0, ∞).
- |x−1| + |x+1| = 2 gives [−1, 1].
- |x²−4| = 3x gives {1, 4}.
- |x| = −1 is empty.
- √|x| = x gives {0, 1}.
- ||x| − x| = 0 gives [0, ∞).
- |x−1| = |x+1| gives {0}.
- A depth-10 nested abs gives the 11 even integers in [−10, 10].

**Radicals.**
- √(x + √x) = 2 gives {(9−√17)/2} with a proven form.
- √x = −1 is empty.
- x^{2/3} = 4 gives {±8}.
- ∛x = −2 gives {−8}.
- √(4x) − 2√x = 0 gives [0, ∞).
- x^{−1/2} = 2 gives {1/4}.
- √(x²+1) = x+1 gives {0} (target outside, non-affine base).
- √2·√x = 2 gives {2}.

**Inequalities.**
- |x−1| < 2 gives (−1, 3).
- √x < x−2 gives (4, ∞).
- √(x+1) ≤ 2 gives [−1, 3].
- |x| ≥ x gives ℝ.
- |x−1| + |x+1| > 2 gives (−∞, −1) ∪ (1, ∞).
- |x| = x ∧ x ≤ 3 gives [0, 3].

**Mixing.**
- e^{|x|} = 2 gives {±ln 2}.
- √(ln x) = 1 gives {e}.
- |eˣ−2| = 1 gives {0, ln 3}.
- e^{√x} = 2 gives {(ln 2)²}.
- e^{|x|} ≤ 2 gives [−ln 2, ln 2].

**Routing.**
- √x + eˣ = 3, and √x + √(x+1) = ln 2, name `EQUATION-CERTIFIED-NUMERICS1`.
- sin|x| names `EQUATION-PERIODIC1`.
- √(x+a) names the parameters gate.
- √(x²+2x+1) = x+1 is refused as dependent radicals (see follow-ups).
- Complex |x| = 1 and √x = 1 are `unsupported`.
- Slice 1 and slice 2 problems route unchanged.

**Substrate.** The fold and each normal-form rewrite, plus radical-domain conditions for even, odd and negative exponents.

**Verifier.** Rejects:
- S1's spurious root (5−√13)/2 by exact substitution;
- a point outside the radical domain;
- a widened zero interval (exact failure at the closed endpoint);
- a shrunk interval;
- a dropped piece;
- a wrongly closed endpoint;
- a proof without its radical-domain step;
- a tampered measure.

Wire replay of a radical point with its form, a RootOf, a zero interval and a mixed interval verifies.

**Resources.** Typed `work` and `cancelled` outcomes on S4.

TypeScript, ESLint, compartment and OOE boundaries, file sizes, the isolation test and the no-caps ratchet pass. The new folder is covered by both ratchets.

Two existing slice-2 verifier tests now fail earlier, with a stronger message, because independent evidence runs first. For example, x = ln 5 in E1 has residual exactly 6. Two slice-2 routing rows (e^{|x|} = 2 and e^{√x} = 2) are now solved here and moved to this gate's tests.

## Bugs found during the gate

- **Aberth seeding overflow** (from gate 3): see Substrate. M1 exposed it through an intermediate RootOf power.
- **Identity at the top goal.** 0·√x is kept by the store for its domain, and the single-kernel path refused the identity. It is now "zero wherever defined" at the top goal.

## Known follow-ups (not caps)

- **Dependent radicals.** When the norm vanishes identically, the radicals still depend on each other, as in √(x²+2x+1), whose base is a perfect square but not written as one. The real branch can switch components (|x+1|), so these problems are refused. Recognizing perfect-power polynomial bases (square-free decomposition) before elimination would decide them.
- **HC4 range contractors** are scheduled in `EQUATION-COMPOSITION1`.
- **Complex modulus and radicals** are unsupported by decision; a future complex gate may revisit them.
- **Transcendental constants inside a radical tower** (√x + √(x+1) = ln 2) need either a transcendental tower or certified numerics.
- **Radical forms** are attached for quadratic and pure binomial roots only, as in slice 1; S4 stays a RootOf.

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
