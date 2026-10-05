# EQUATION-COMPOSITION1 — Ranges, Monotonicity, Injectivity and Interval Families (slice 5)

Date: 2026-10-03
Status:
- **Part A (real)**: implemented and backend-verified on 2026-10-03; private, no production caller.
- **Part B (complex principal logs and depth evidence)**: implemented and backend-verified on 2026-10-04; this completes the gate.

Gate: backend only. Stage 9 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: [`EQUATION-PERIODIC1`](equation-periodic1-spec.md) and every earlier gate. No dependency, schema, workspace or production caller is added. **No code from the old Equation engine is used**; the old engine appears only as the inventory baseline.

## Outcome (part A)

Corpus C1–C7 was already exact after gates 6 and 8. This gate decides, exactly, the real problems the earlier slices deferred here because their kernels do not invert together:
- equations and inequalities mixing exp, log, trig, inverse trig, abs, radicals and the variable itself, whenever certified ranges, monotonicity and exact candidates settle them;
- f(U) = f(V) for injective outer functions at any depth;
- inequalities through a non-affine common trig argument, as families of intervals in an integer parameter.

When an answer would need a boundary that is not a closed form (eˣ + sin x > 0 near −3.18), the problem names `EQUATION-CERTIFIED-NUMERICS1`.

User decisions (2026-10-03):
- **Range reasoning**: split by exact sign. The line is cut at exact points, and each piece is decided by certified ranges and monotonicity.
- **Monotone targets**: uniqueness plus exact candidates. A root is accepted only when an exact candidate is confirmed.
- **Non-affine families in inequalities**: a new typed set kind, the interval family.
- **Complex**: several principal logs only (part B). Non-affine complex intersections, exclusions and nested quadratic levels stay recorded follow-ups.
- **Delivery**: two PRs.

## Semantics

- **Interval family** (new set kind `interval-family`, one variable): the union over integers k with from ≤ k ≤ to (either bound may be absent) of the intervals between lo(k) and hi(k). Members are pairwise disjoint and ordered in k. Lower-bounded ranges start at k = 0, upper-bounded ones end at k = 0.
- **Range atoms** need no new set kind. A mixed atom gets an exact, complete zero set like any other atom, so the existing piecewise decision, its samples and the verifier apply unchanged.

## Method

### Injective cancellation (`composition/injective.ts`)

A zero goal a·f(U) + b·f(V) = 0 (with constants a, b, through a constant factor) becomes a goal on U and V, an equivalence on the natural domain:

| f | Goal |
| --- | --- |
| atan, log, asin, acos, W₀, W₋₁ (a = −b) | U = V |
| u^{p/q} with odd p and odd q, or with even q (a = −b) | U = V |
| u^{p/q} with even p and odd q (a = −b) | U = V or U = −V |
| exp | U − V = ln(−b/a) when −b/a > 0, else no zero |

The domain conditions are already recorded by the earlier rules, and the decision evaluates conditions first. Polynomial bases with integer exponents stay with the polynomial algebra.

### Certified ranges (`composition/range.ts`, `composition/derivative.ts`, `composition/limits.ts`)

- **Interval arithmetic over extended-real boxes** with open/closed ends and outward rounding, built on the certified point enclosures of `enclosure.ts`.
- **Exact kernel bounds keep strictness**: exp > 0, atan ∈ (−π/2, π/2), sin and cos ∈ [−1, 1].
- **Symbolic derivative** over the vocabulary (explicit stack).
- **Exact limits** at ±∞ and at finite ends (sums, products, powers, exp, log, atan), with signs of vanishing parts taken where domain conditions guarantee them.

### Range zeros (`composition/zeros.ts`, the zero finder's fallback)

When the zero finder refuses a goal, except for parameter and systems refusals, the goal's complete zero set is computed as follows:

1. **Cut points**: the line is cut at exact domain breakpoints (zeros of denominators, log, radical, abs and arc arguments). On every open piece the expression is then defined, continuous and real-analytic. A piece where it is undefined at a sample is skipped. A piece where it vanishes at two samples is refused (it may vanish on an interval).
2. **Worklist per piece**: sub-intervals with exact end signs, bounded ones first.
   - A range that excludes 0 proves no zero.
   - A derivative range ≥ 0 (or ≤ 0) makes the expression strictly monotone, because it is analytic and not identically zero. End signs, or exact limits on tails, then decide.
   - A sign change has exactly one zero, accepted only if an exact candidate is confirmed (`realSign` = 0).
   - Otherwise the sub-interval is split at a simple rational in its middle third (internal only), or a tail is cut outward.
3. **Candidates**: zeros of the additive terms, and preimages of the special values of each kernel (trig at multiples of π/12, exp at 0, log at 1, atan/asin/acos at their special values, radicals at 0 and 1, W at 0, e, −1/e).
4. **Oscillation**: a trig kernel whose argument is unbounded on a bounded sub-interval oscillates infinitely often there, and is refused at once. An oscillating tail is refused at its first root that is not a closed form.
5. **Refusal**: if the fallback cannot finish, the original refusal is reported, so routing messages stay stable.

**Termination.** Every step splits a bounded sub-interval by at least a third, or moves a tail cut outward. Only a zero that is neither exact nor simple (a tangency at a non-closed-form point), or infinitely many exact zeros in a mixed sum, could exhaust the budget, giving a typed `resource` stop. This is the same caveat as gate 6.

### Interval families (`composition/families.ts`, from `closed-form-set.ts`)

This route runs when the periodic decision refuses non-affine families, or when the zero finder refuses a family level.

1. **Common argument and pieces**: all trig kernels must share one argument u = φ(x). The line is cut where φ′ vanishes and where the trig-free atoms change truth (decided by the closed-form engine), so φ is strictly monotone on each piece J.
2. **Problem in t = φ(x)**: on J, the problem is posed over the exact image φ(J), whose ends come from exact limits, and decided by the periodic engine of slice 4.
3. **Mapping back** through φ⁻¹ on J, peeled layer by layer (affine, exp, log, rational powers with the sign from the piece):
   - a periodic tail [a, b] + P·k becomes an interval family;
   - point components become `periodic` value families;
   - bounded parts are mapped interval by interval;
   - a member touching an image limit (e^{−x} → 0 as x → ∞) maps to ±∞.

## Implemented contracts

- **New `core/composition/`**: `injective.ts`, `derivative.ts`, `range.ts`, `limits.ts`, `zeros.ts`, `families.ts`, and tests.
- **`generators/inversion.ts`**: injective cancellation before kernel strategies; the range fallback per goal (refusals inside a goal are now thrown, so the fallback sees them).
- **`generators/closed-form-set.ts`**: the interval-family route.
- **`generators/verify.ts`**:
  - evidence for interval families: the first three members' closed ends and inner samples;
  - leaf atoms are rebuilt only for finite and interval claims.
- **`representation/solution-set.ts`, `wire.ts`**: the `interval-family` kind (validation, `setKey`, codec).
- **`representation/enclosure.ts`**: `sinCosBox` and `rootBounds` exported.
- **`decision/test-helpers.ts`**: describes interval families and the other side of binary constraints.

## Acceptance evidence (part A)

`node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 30 files / 427 tests pass (40 new).

**Injective cancellation:**

| Case | Result |
| --- | --- |
| e^{sin x} = e^{cos x} | π/4 + πk |
| atan(eˣ) = atan(x + 1) | {0} (old: refused) |
| (x² − 1)³ = (2x + 2)³ | {−1, 3} |
| log(x² + 1) = log(2x) | {1} |
| √(x + 3) = √(2x) | {3} |
| sin²x = cos²x | π/4 + (π/2)k |

**Ranges:**
- eˣ + sin x = −2 is empty.
- eˣ + sin x > −1 is ℝ.
- x² + cos x = −1 is empty.
- atan x + eˣ ≥ −π/2 is ℝ, via a monotone tail with the exact limit 0.
- x ≥ 1 ∧ e^{x−1} + sin x + 2 > 0 gives [1, ∞).
- (x² − 4)(eˣ + 2 + sin x) > 0 gives (−∞, −2) ∪ (2, ∞).
- |x|(eˣ + 2) = 0 gives {0}.
- √x + √(x + 1) = ln 2 is empty.

**Monotone targets:**
- x + sin x = 0 gives {0}.
- x + sin x > 0 gives (0, ∞).
- x³ + atan x = 0 gives {0}.
- (x − 1)(x + sin x) ≥ 0 gives (−∞, 0] ∪ [1, ∞).
- sin|x| + x = 0 gives {0}.
- 2ˣ + 3ˣ = 5 gives {1}.

**Interval families:**
- sin(eˣ) > 1/2 gives (ln(π/6 + 2πk), ln(5π/6 + 2πk)), k ≥ 0.
- sin √x ≥ 0 gives [4π²k², (2πk + π)²], k ≥ 0.
- cos(ln x) < 0 gives (e^{π/2+2πk}, e^{3π/2+2πk}), k ∈ ℤ.
- sin(e^{−x}) > 0 gives a family plus (−ln π, ∞).
- sin x² > 0 gives two families.
- sin x³ ≥ 1/2 gives a family on each side of the turning point.
- sin(eˣ) > 1/2 ∧ x ≤ 3 gives four exact intervals.

**Routing:**
- eˣ + sin x > 0, x + sin x = 1, cos x = x and x·sin x = 1 name certified numerics.
- Dependent radicals stay with slice 3.
- Slices 1–4 are otherwise unchanged.

**Substrate:** point ranges match mpmath (atan 1 + e, sin e + √2, ln 3·cos 2); strict kernel bounds on ℝ; derivatives.

**Verifier** rejects:
- a moved piece end;
- a dropped piece;
- a false empty claim;
- a widened family;
- a family k-range with undefined members;
- an injective answer with a point outside the log domain.

Wire replay of interval families, range answers and injective answers verifies. Typed `work` and `cancelled` stops are covered.

TypeScript, ESLint, compartment and OOE boundaries, and file sizes pass. The isolation test and the no-caps ratchet cover `composition/`.

Existing tests changed by design: three routing rows are now decided exactly:
- 2ˣ + 3ˣ = 5 gives {1};
- √x + √(x+1) = ln 2 is empty;
- sin|x| + x = 0 gives {0}.

They are replaced by 2ˣ + 3ˣ = 6, √x + √(x+1) = ln 5 and sin|x| + x = 1, whose roots are not closed forms.

## Bugs found during part A

- **Recursion on a scaled sum.** Candidate generation called the zero finder on the expression itself when it was a constant multiple of a sum (relations stored as 0 = h), which recursed without end. Additive terms are now taken through the constant factor, and never the expression itself.
- **Tails before bounded pieces.** The worklist popped the unbounded tail first and kept cutting it outward. Tails now wait at the bottom of the stack.
- **Lost strictness.** Monotonicity was lost where the derivative touches 0 at a cut point (1 − cos x at 0), and through rounding of π (atan x + eˣ + π/2). Weak monotonicity on analytic pieces and exact tail limits fix both.
- **Unnormalized u-sets.** The u-level periodic set was mapped before normalization, which split one family into two adjacent ones.

## Outcome (part B)

### Several principal logarithms over ℂ (`periodic/complex-zeros.ts`)

A goal Σ cⱼ·Log uⱼ(z) + R = 0 with rational cⱼ, rational functions uⱼ and a constant R, read through the shared `linearForm`:

- **Candidates.** With L the lcm of the denominators, every zero satisfies ∏ uⱼ^{L·cⱼ} = e^{−L·R}, because exp(n·Log u) = uⁿ for integer n. This is a rational equation with exact roots.
- **Exact acceptance.** At such a root the sum equals 2πi·m/L for an integer m. The root is a zero exactly when m = 0. m is computed from the Arg enclosures of the uⱼ (exact on the branch cut), and since it is an integer, enclosures fix it without any transcendental zero test.
- **Refusals:**
  - an irrational coefficient → parameters;
  - the variable outside the logs → certified numerics, as before;
  - a family level → composition.

### Exact zero test for logs of algebraic numbers (`representation/log-zero.ts`, used by `realSign`)

The test covers a + Σ cⱼ·ln αⱼ with real algebraic a, rational cⱼ and real algebraic αⱼ > 0:
- if a ≠ 0, the value is never zero (Lindemann–Weierstrass);
- if a = 0, it is zero exactly when ∏ αⱼ^{L·cⱼ} = 1, decided by exact algebraic arithmetic.

This extends the gate-6 test, which covered rational αⱼ. Without it, the verifier would refine forever on real parts such as ln((√5−1)/2) + ln((√5+1)/2).

### Faster certified enclosures (`representation/enclosure.ts`)

Deep chains feed the enclosures points with very long denominators, and the series then spent their time in gcds.
- **atan series**: now runs in fixed point, with a lower and an upper chain bracketing the true terms.
- **atan, asin, sin and cos**: a point with a long denominator is rounded outward first. This is sound because atan and asin are increasing, and sin and cos are 1-Lipschitz (the result is widened by the rounding distance).

### Depth evidence (`composition/depth.test.ts`)

Depth 3 and depth 25 are decided and verified by the same code:

| Chain | Path | Depth 25 |
| --- | --- | --- |
| ln(1 + ln(1 + … ln(1 + x))) = 0 → {0} | inversion | about 35 s |
| atan∘…∘atan(x) = atan∘…∘atan(2x − 1) → {1} | injective cancellation | well under a second |
| sin∘…∘sin(x) + x = 0 → {0} | range engine | about 4 s |
| sin∘…∘sin(x) = 1/10 → {asin^n(1/10), π − asin^n(1/10)} + 2πℤ | periodic chains | about 100 s |

Times include verification. The cost grows roughly linearly per level, because the constants nest. Depth 25 also stops with typed `work` and `cancelled` outcomes.

## Acceptance evidence (part B)

**Logs over ℂ:**
- log z + log(z + 1) = 0 gives (√5 − 1)/2. The root (−1 − √5)/2 fails the Arg sum.
- 2·log z = log 4 gives {2}.
- log z − log(z − 1) = iπ/2 gives (1 − i)/2.
- log z + log(z + 1) = iπ gives only (−1 + i√3)/2.
- log z + log(z + 1) + log(z + 2) = log 6 gives {1}.
- Algebraic roots are checked by their minimal polynomials.

**Still refused:**
- √2·log z + log(z + 1) = 0 (parameters);
- log z + z = 1 (certified numerics).

**Substrate:**
- ln((√5−1)/2) + ln((√5+1)/2) = 0 and ln(1+√2) + ln(√2−1) = 0 exactly;
- ln 2 + ln √2 ≠ 0;
- a nonzero algebraic part ≠ 0;
- `realSign` returns 0 exactly.

**Verifier** rejects the root that fails the Arg sum and a false empty claim. The wire replay of a log sum verifies.

## Bugs found during part B

- **Slow enclosures at depth.** Depth-25 chains exhausted 5·10⁸ work units in enclosures, through gcds on long rationals in the atan and alternating series. This is fixed by fixed-point atan and outward rounding of long points.
- **A weak positivity check.** The first positivity check in the algebraic log test read an isolating interval that may straddle 0. It now compares exactly.

## Known follow-ups (not caps)

- Complex: intersections and exclusions with non-affine families, and nested families whose level is quadratic in its parameter (recorded by user decision; no gate names them yet).
- Depth-25 periodic chains with nested constants cost about 100 s with verification; arithmetic hot paths belong to `EQUATION-PROOF-PERFORMANCE1`.

- The φ′ = 0 cut splits strictly monotone arguments such as x³ at 0 into two families (correct, not merged).
- Interval families need one common trig argument with a peelable inverse; others stay refused, naming composition.
- Non-exact boundaries and isolated numeric roots: `EQUATION-CERTIFIED-NUMERICS1`.

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
