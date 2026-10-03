# EQUATION-PERIODIC1 — Trig, Periodic Families and Complex Exponential Families (slice 4)

Date: 2026-10-03
Status:
- **Part A (real)**: implemented and backend-verified on 2026-10-03; private, no production caller.
- **Part B (complex exp/log/trig families)**: follows in a second PR.

Gate: backend only. Stage 8 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: [`EQUATION-CONSTRAINTS1`](equation-constraints1-spec.md) and every earlier gate. No dependency, schema, workspace or production caller is added. **No code from the old Equation engine is used**; the old engine appears only as the inventory baseline.

## Outcome (part A)

Over ℝ, the core exactly decides equations, inequalities and conjunctions in one target that involve sin, cos, tan, asin, acos and atan. They may be mixed with the kernels of slices 2–3 and composed at any depth.

Answers are exact:
- **periodic families**, e.g. π/6 + 2πk;
- **periodic intervals**, e.g. (π/6, 5π/6) + 2πk;
- **families on half-lines**, e.g. kπ for k ≥ 1;
- **families in integer parameters**, e.g. ln(π/6 + 2πk) for k ≥ 0;
- **finite sets**, e.g. the 32 points kπ in [0, 100];
- **proven empty sets**.

Every answer comes with a replayable proof log and an independent verifier.

User decisions (2026-10-03):

- **Complex**: exp/log and trig families (part B).
- **Inequalities**: full periodic, with periodic tails on half-lines.
- **Composition chains**: included. C1–C5, and families through other kernels.
- **Bounded results**: enumerated as exact points, with no count cap. Members that accumulate stay a constrained family.
- **Inverse trig**: single kernels, and sums with rational coefficients.
- **Target outside trig**: factor split only. Otherwise `EQUATION-CERTIFIED-NUMERICS1`.
- **Residue window**: (−P/2, P/2].
- **Coefficients**: the slice-2 policy. The half-angle polynomial is solved up to degree 2 with transcendental coefficients, and higher degree names `EQUATION-PARAMETERS1`.
- **Delivery**: two PRs.

## Semantics and canonical forms

- **Affine family** {r + P·k : k ∈ ℤ}, P > 0. Points use the principal residue r ∈ (−P/2, P/2]. An interval component is stored by its left end, in [−P/2, P/2), so the tan domain reads (−π/2, π/2) + πk. The period is minimal.
- **Orbit decomposition.** Point families split into maximal orbits r + jP/m (j = 0…m−1, largest m first). Cosets of one subgroup are disjoint, so the split is unique. T5 therefore reads π/2 + 2πk ∪ π/6 + (2π/3)k, which is the textbook sin A = sin B form.
- **New `periodic-set` kind**: {x ∈ range : x − kP ∈ components}. The range is ℝ or a half-line starting (or ending) at a component occurrence. Unions merge commensurable periodic sets over the common period, and absorb contained points.
- **The existing `periodic` kind** carries families whose value is not affine in the parameter, as in C2. Parameter constraints are canonical conditions; parameters are named k (or k1, k2, …).
- **Angles.** A residue with an algebraic unit point W = e^{iθ} is identified exactly through W. A root of unity always prints as q·π. Otherwise the derivation's own form is kept: asin(1/3) from sin, atan 2 from tan.

## Exactness and termination

- **Exact trig values.** sin, cos and tan of angle-linear arguments evaluate exactly. These arguments are a + Σ nⱼ·arcⱼ(cⱼ) + qπ, with a and cⱼ real algebraic. The unit point W is computed as a complex RootOf:
  - roots of unity e^{iπq} are roots of Φₙ, selected by certified trig enclosures;
  - arcs give W(asin c) = √(1−c²) + ic, and similarly for acos and atan;
  - sums and integer multiples become products and powers.
- **Zero test.** realSign recognizes exact zeros of angle-linear forms, after expanding products over sums, before refining. When a ≠ 0, θ ≠ 0 by Lindemann–Weierstrass. When a = 0, θ = 0 exactly when W = 1 and an enclosure puts θ within π of 0.
- **Rational multiples of π.** These are recognized when W's minimal polynomial is cyclotomic. The candidates n satisfy φ(n) = deg W, so n ≤ 2·deg². This is a mathematical bound, not a cap.
- **Transcendental residues** such as asin(ln 2) are compared by refinement under the budget. As in gate 6, only two different closed forms of the same value could end in a typed `resource` stop, never in a wrong answer.

## Implemented contracts

### Substrate (`core/representation/`, `core/algebraic/`)

- **`enclosure.ts`**: certified sin and cos (reduction by π/2, alternating Taylor series), tan, atan (Euler series), asin via 2·atan(x/(1+√(1−x²))), and acos. Over intervals, ±1 is added wherever an extremum k·π/2 may lie inside.
- **New `algebraic/cyclotomic.ts`**: Φₙ and Euler's φ.
- **`evaluate.ts`**: exact sin/cos/tan through unit points, roots of unity, and a product with an exact zero factor is 0.
- **New `representation/angles.ts`**: unit points (memoized), root-of-unity recognition, canonical q·π, the expanded zero test.
- **`real-order.ts`**: the exact zero test runs after a first inconclusive enclosure.
- **`expression.ts`** folds, all value- and domain-preserving:
  - classic special angles (multiples of π/6 and π/4);
  - reduction of π-multiple argument terms by whole periods;
  - asin, acos and atan at ±1/2, ±1 and 0;
  - asin and acos of a rational in [−1, 1] are real constants.
- **`solution-set.ts` and `wire.ts`**: the `periodic-set` kind (window shift, edge merge, minimal period, orbits, half-line validation, union merging and absorption, exact membership) and its codec.
- **`complex-roots.ts`**: unchanged from gate 7.

### Slice (`core/periodic/`)

- **`normal-form.ts`**: the `trig-domain` rule (`EQUIVALENT_UNDER_CONDITIONS`). tan u needs cos u ≠ 0; asin and acos of u need 1 − u ≥ 0 and 1 + u ≥ 0.
- **`families.ts`**:
  - affine detection;
  - canonical residue groups;
  - **exact parameter restriction**: a condition on L(κ) is decided as a one-dimensional problem in a real u by the closed-form engine, then intersected with ℤ by exact floors;
  - kernel periods, common periods and structural periodicity (each affine argument shifted by a·P folds back);
  - lifting, membership, and the merging of affine half-families (sin|x| = 0 is πℤ).
- **`inversion.ts`**:
  - **one trig kernel** gives canonical residues (affine arguments yield families directly, others a parametric goal u = r + Pκ);
  - **parametric goals** pass through exp, log, abs, radicals, quadratics and nested trig/inverse trig, each step restricting the parameter (bounded ranges enumerated);
  - **several trig kernels** use the harmonic form α·sin w + β·cos w + γ = R·sin(w + φ) + γ when linear in one frequency, otherwise Chebyshev expansion and t = tan(w/2) with the denominator cleared exactly and w = π checked exactly;
  - **sums of inverse trig** use sin(F − C) = 0 through gate-7 tower elimination, each candidate confirmed by the angle zero test.
- **`decide.ts`**:
  - **common period**, verified structurally. Inequality atoms must be periodic, trig-free, or products of such factors; = and ≠ atoms need only their zero sets.
  - **No finite critical points**: one window decides the pattern.
  - **Otherwise**: the region [min F − 2P, max F + 2P] is decided piece by piece. If both tails follow one pattern and the set contains all of it, the answer is that periodic set plus bounded extras. Otherwise each tail is the pattern on a half-line, starting at the first whole component from which the set agrees with it, and the bounded rest is enumerated.
  - **Families in integer parameters**: restricted piece by piece.
- **`constraints/piecewise.ts`**: abs of periodic expressions is decided over one period window, giving periodic zero points and intervals.

### Engine changes (`core/generators/`, `core/decide.ts`)

- **Zero finder**: trig strategies, factor splitting (A·B = 0), and families in zero results. Placeholders are shared with nested calls.
- **`solveRational`**:
  - a monomial has the single zero 0;
  - a·v² + c = 0 needs only the certified sign of −c/a;
  - 'any' allows transcendental quadratics for half-angle polynomials only.
- **Pipeline**: log-domain → normal form → log-domain → radical-domain → trig-domain → natural-domain → move-to-zero.
- **Verifier** (independent evidence first):
  - residues and interval samples at five periods;
  - closed range ends;
  - the first members of families;
  - certified-sign evidence for inequalities at non-algebraic points;
  - a full-line periodic set needs every trig inequality (or each trig factor) structurally periodic with a multiple of the claimed period.
- **Dispatcher**: trig and inverse trig of the target go to the closed-form engine. Complex problems are refused until part B.

## Acceptance evidence (part A)

`node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 26 files / 338 tests pass (63 new). Reference digits come from Python mpmath; it is never a runtime dependency.

| Case | Result | Old engine |
| --- | --- | --- |
| T1 sin x = 1/2 | {π/6, 5π/6} + 2πk | exact |
| T2 3sin²x + 2sin x − 1 = 0 | {−π/2, asin(1/3), π − asin(1/3)} + 2πk | exact |
| T3 sin⁴x − 5sin²x + 4 = 0 | π/2 + πk | refused |
| T4 sin x + cos x = 1 | {0, π/2} + 2πk | exact |
| T5 sin 2x = cos x | π/2 + 2πk ∪ π/6 + (2π/3)k | exact |
| T6 sin x = 0 | πk; on [0, 100] the 32 exact points kπ | decimals |
| T7 sin x = 2 | empty | exact |
| C1 sin(cos x) = 1/2 | ±acos(π/6) + 2πk | exact |
| C2 sin(cos eˣ) = 1/2 | ln(acos(π/6) + 2πk) for k ≥ 0, and ln(2πk − acos(π/6)) for k ≥ 1 | exact |
| C3 sin⁴(x) nested = 1/10 | {asin⁴(1/10), π − asin⁴(1/10)} + 2πk | decimals |
| C4 cos⁷ x = 1/2 | empty | exact |
| C5 e^{sin x} = 2 | {asin(ln 2), π − asin(ln 2)} + 2πk | exact |

**Families.**
- sin eˣ = 1/2 gives ln(π/6 + 2πk) and ln(5π/6 + 2πk), k ≥ 0.
- sin √x = 0 gives {0} ∪ {(πk)² : k ≥ 1}.
- sin x² = 0 gives {0} ∪ {±√(πk) : k ≥ 1}.
- sin|x| = 0 gives πℤ.

**Inequalities and conjunctions.**
- sin x > 1/2 gives (π/6, 5π/6) + 2πk.
- tan x ≥ 1 gives [π/4, π/2) + πk.
- cos x ≤ 0 gives [π/2, 3π/2] + 2πk.
- |sin x| = sin x gives [0, π] + 2πk.
- |sin x| < 1/2 gives (−π/6, π/6) + πk.
- sin x ≥ 0 ∧ x² ≤ 10 gives [−√10, −π] ∪ [0, π].
- sin x = 0 ∧ x > 0 gives kπ on [π, ∞).
- sin x = 0 ∧ x ≠ 0 gives two half-lines.
- x·sin x > 0 gives (−π, 0) + 2πk on (−∞, 0) and (0, π) + 2πk on (0, ∞).
- sin x = 1/2 ∧ cos x > 0 gives π/6 + 2πk.

**Inverse trig, factors and shifts.**
- asin x = π/6 gives {1/2}.
- atan x = 2 is empty.
- atan x + atan 2x = π/4 gives (−3 + √17)/4, 30 digits matching mpmath.
- x·sin x = 0 gives πℤ.
- (eˣ − 2)·sin x = 0 gives πℤ ∪ {ln 2}.
- sin(x + 1) = 1/2 gives {π/6 − 1, 5π/6 − 1} + 2πk.
- sin 3x = 1/2 gives {π/18, 5π/18} + (2π/3)k.
- sin(x + 1) + cos x = 0 gives −atan((1 + sin 1)/cos 1) + πk.

**Routing.**
- cos x = x, x·sin x = 1, sin x + sin √2x, and sin x + eˣ name `EQUATION-CERTIFIED-NUMERICS1`.
- sin(ax) names the parameters gate.
- Complex trig names this gate's part B.
- Slices 1–3 are unchanged.

**Substrate.**
- Enclosures of sin 1, cos 1, sin 10⁶, cos(−7/3), tan ½, atan 2, asin(1/3), acos(−2/3) and asin(99/100) are checked against mpmath (40 digits).
- Exact trig values and folds.
- Root-of-unity recognition (asin(√3/2) = π/3, 2·atan(2+√3) = 5π/6, atan(2−√3) = π/12).
- Angle zero tests (atan 2 + atan 3 = 3π/4).
- Canonical periodic sets, with a wire round trip.

**Verifier.** Rejects:
- a wrong residue;
- a wrong period;
- a moved component end;
- a wrong half-line;
- a dropped enumerated point;
- an interval pattern claimed on the whole line for x·sin x > 0;
- a proof without its trig-domain step.

Wire replay of periodic sets, half-lines, families and T5 verifies.

**Resources.** Typed `work` and `cancelled` outcomes on T5.

TypeScript, ESLint, compartment and OOE boundaries, file sizes, the isolation test and the no-caps ratchet pass; the new folder is covered by both ratchets.

Existing tests changed by design:
- A slice-2 routing row (e^{sin x} = 2) and a slice-3 routing row (sin|x| = 0) are now solved here; they are replaced by still-refused mixes.
- The slice-2 complex refusal message now names trig as well.

## Bugs found during part A

- **Unfolded zero products.** 0·asin(1/3) (asin was not known to be a real constant) and (π − a) − (π − a) (no distribution of −1) are exactly zero but were not recognized, so refinement ran to the budget. The fixes:
  - asin and acos of rationals in [−1, 1] are real constants;
  - exact evaluation knows that zero times a defined value is 0;
  - the angle zero test expands products over sums first.
- **Hidden period halving.** With transcendental coefficients the half-angle roots of sin(x+1) + cos x differ by exactly π, which no comparison can detect. The harmonic form (one sinusoid) gives residues whose difference is structural.
- **Inflated half-angle degree.** Clearing (1 + t²) denominators through `rationalForm` inflated the degree with transcendental coefficients. The fix clears them exactly by homogeneous parts in the kernels.

## Known follow-ups (not caps)

- Part B: complex exp/log/trig families (same gate).
- Families in several integer parameters are decided only for a single equation without further conditions.
- Inequalities with families that are not affine in their parameter go to `EQUATION-COMPOSITION1`.
- Transcendental residues equal to a different closed form could only be ordered by refinement (the gate-6 caveat).
- Presentation: residues keep their derivation form (asin, atan) when they are not q·π. Display normalization belongs to the result contract.

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
