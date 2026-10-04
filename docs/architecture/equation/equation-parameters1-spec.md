# EQUATION-PARAMETERS1 — Case Trees over ℚ(p…) (gate 10)

Date: 2026-10-04
Status:
- **Part A (polynomial and rational relations)**: implemented and backend-verified on 2026-10-04; private, no production caller.
- **Part B (parametric kernels, transcendental constant coefficients, follow-up ledger)**: implemented and backend-verified on 2026-10-04, in the same PR. This completes the gate.

Gate: backend only. Stage 10 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: [`EQUATION-COMPOSITION1`](equation-composition1-spec.md) and every earlier gate. No dependency, schema, workspace or production caller is added. **No code from the old Equation engine is used**; the old engine appears only as the inventory baseline.

## Outcome (part A)

Until this gate every problem with a free symbol besides the target was refused, naming `EQUATION-PARAMETERS1`. Polynomial and rational relations with coefficients in ℚ(p…) are now decided exactly, as case trees whose conditions are exact conditions on the parameters (design rule 8: every pivot on a parameter is a case, never a silently generic formula).

Exit evidence of the roadmap:

| Problem | Answer |
| --- | --- |
| a·x² + 2x + 1 = 0 | a = 0: {−1/2}; a ≤ 1, a ≠ 0: {(−2 ∓ √(4 − 4a))/(2a)}; a > 1: ∅ |
| x⁵ + a·x + 1 = 0 | a < a₀: root₁, root₂, root₃ of x⁵ + a·x + 1; a = a₀: two exact algebraic roots; a > a₀: root₁. Here a₀ is the real zero of 256a⁵ + 3125 |

User decisions (2026-10-04):
- **Parameters**: any number. With one parameter, cases are exact parameter intervals and points with algebraic breakpoints, with no redundant splits. With several, cases are polynomial sign conditions on the parameters; a case may be empty as a region of parameters, because deciding that is semialgebraic (`EQUATION-SEMIALGEBRAIC1`).
- **Problems**:
  - polynomial and rational relations (part A);
  - single-kernel inversions with parameters (part B);
  - mixed kernels with parameters are refused and recorded in the follow-up ledger (part B).
- **Root form**: radical formulas up to degree 2; from degree 3, a parametric root "the j-th real root of P(x; p)", with the root count fixed by the case.
- **ℂ**: complex parameters, equations and ≠ only.
- **ℝ**: equations, inequalities, ≠ and conjunctions.
- **Transcendental constant coefficients**: RootOf with exact signs (part B).
- **Any target**: the target is part of the problem; every other free symbol is a parameter. Solving a·x² + 2x + 1 = 0 for a uses x as the parameter. Choosing a target automatically is a ledger item.
- **Delivery**: one PR, two commits.

## Semantics

- **`root` point value**: `{ poly, variable, index }`, the index-th real root (1 = smallest) of the polynomial `poly` in `variable`, whose coefficients carry parameters. It is valid only inside a case whose conditions fix the number of real roots.
- **`root-set` set kind**: every complex root of `poly` in the variable (distinct roots, ℂ only).
- **Case trees** (the existing `case-tree` kind): each case is a conjunction of conditions on the parameters with its set. Over ℝ with one parameter the cases tile the line; with several they are exhaustive sign splits. A parametric interval union keeps the order in which it was built (its ends have no numeric order), while finite sets are still deduplicated and sorted by identity.
- **Proof**: the proof log is the problem itself. The evidence is the verifier's specialization (below).

## Method

### Atoms (`parameters/mpoly.ts`, `parameters/specialize.ts`)

Every relation, condition and natural-domain base becomes a polynomial atom P(x, p…) op 0 over ℚ:
- e = n/d gives n op 0 for = and ≠, and n·d op 0 for orders;
- every base of a non-positive power adds num(base) ≠ 0.

There is no cancellation: a vanishing denominator is a recorded condition, never divided out. Anything that is not a rational function of the target and the parameters is refused, naming this gate's part B.

### One parameter: exact cells (`parameters/bivariate.ts`, `parameters/cells.ts`)

1. **Basis.** The atoms become polynomials in ℚ[p][x]: contents and primitive parts over ℚ[p], gcds in x by the primitive pseudo-remainder sequence, and a coprime square-free basis.
2. **Projection.** The projection polynomials are:
   - the contents;
   - the leading coefficients;
   - the discriminants res(B, B′);
   - the pairwise resultants.

   Resultants in p are computed by evaluation at integers and exact Newton interpolation under the bound deg_p res(A, B) ≤ deg_x B·deg_p A + deg_x A·deg_p B.
3. **Cells.** Their real zeros cut the p-line. On each open cell every basis polynomial keeps its degree and its number of distinct real roots, and roots of different polynomials never meet. The answer is therefore decided at one rational sample by slice 1, and every root in it is named by its place:
   - degree 1: −c₀/c₁;
   - degree 2: (−b ∓ √D)/(2a), with the sign fixed by sign(a) on the cell;
   - degree ≥ 3: a parametric `root`.

   Every named answer is instantiated back at its sample and must equal the decision there.
4. **Points.** Every critical point is decided exactly, with algebraic coefficients.
5. **Merging.** A point joins a neighbouring cell when that cell's named answer, instantiated at the point, equals the point's answer, and equal cells on both sides then merge. Cells with the same answer on both sides of a different point become one case with p ≠ c.

Over ℂ the projection's complex zeros are the exceptional points. The generic answer, decided at a rational sample, is a union of whole root sets of basis polynomials:
- degree 1 and 2: explicit points (principal square root);
- degree ≥ 3: a `root-set`.

The generic case is conditioned on the irreducible projection factors being nonzero, unless every root of a factor already gets the generic answer.

### Several parameters: sign-condition trees (`parameters/tree.ts`)

- **Conditions.** Atoms free of the target become conditions; when a condition fails, the set is empty.
- **One atom in the target, degree ≤ 2**, splits as follows:
  - its leading coefficient: = 0 recurses on the lower degree;
  - over ℝ, an order relation also splits the sign of the leading coefficient;
  - for degree 2, the discriminant (< 0, = 0, > 0 over ℝ; = 0, ≠ 0 over ℂ). Sibling branches with the same set merge (D ≤ 0, D ≥ 0).
- **Over ℂ**, an equation of degree ≥ 3 is the root set of its polynomial.
- **Refusals** (both name `EQUATION-SEMIALGEBRAIC1`): conjunctions of several atoms in the target, and real roots of degree ≥ 3, because both need the relative order of roots of different polynomials.

### Exact zero tests with algebraic coefficients (`decision/algebraic-coefficients.ts`, `algebraic/root-of.ts`)

Deciding a critical point means evaluating polynomials whose coefficients are algebraic, at algebraic points. Exact algebraic arithmetic there built minimal polynomials of degree about 75 and took 11.5 s per zero set for x⁵ + a₀x + 1.

The zero and sign tests now use **Liouville's inequality** (Waldschmidt, Prop. 3.14). For F ∈ ℤ[X₁…Xₖ] and algebraic αᵢ in a field of degree D, F(α) ≠ 0 implies

log|F(α)| ≥ −(D−1)·log L(F) − D·Σ Nᵢ·h(αᵢ),

with h(α) ≤ log ‖min α‖₂ / deg α (Landau). A certified disk below this bound proves the value is zero; a disk excluding 0 gives its sign. Real refinement uses homogeneous integer evaluation instead of normalized rationals. The same zero set now takes 0.34 s, and x⁵ + a·x + 1 decides in 2.7 s.

### Verifier (`parameters/verify.ts`)

1. **The proof** is the problem itself: one state, no steps.
2. **Samples** come from the cases' own conditions:
   - one parameter over ℝ: every zero of every condition, and a rational between and beyond them;
   - over ℂ: those zeros and generic rationals;
   - several parameters: grid tuples of small rationals, all of them up to 7³, otherwise the first 512.
3. **Tiling.** Every sample must satisfy the conditions of exactly one case.
4. **Specialization.** At each sample, the case's set must equal the problem decided by slice 1 with the parameters replaced by the sample.
5. **Coverage.** With one parameter, every case must be sampled.
6. **Re-derivation** must give the same canonical tree.

Tampering is rejected by the independent evidence alone, before re-derivation:
- a moved breakpoint;
- a wrong root index;
- a missing a = 0 case;
- swapped interval ends;
- a dropped branch of a several-parameter tree.

## Evidence (part A)

`parameters/parameters.test.ts`, 16 tests:
- **One parameter:** the quadratic and quintic exits; a·x > 1; x² < a; a conjunction; rational relations; solving for a.
- **Several parameters:** the general quadratic (6 cases); a·x² + b < 0.
- **ℂ:** a·x² + 1; x³ + a·x + b as a root set; x² + a with no case.
- **Refusals:** semialgebraic refusals; part-B refusals.
- **Verifier and wire:** tampering; wire replay of case trees, parametric roots and root sets.
- **Resources:** typed `work` and `cancelled` stops.

Decimals in tests are checked against mpmath.

## Part B

User decisions (2026-10-04, part B):
- **Kernel relations:**
  - = and ≠ for exp, ln, sin, cos, |·| and q-th roots;
  - <, ≤, >, ≥ for the monotone kernels (exp, ln, roots) and |·|;
  - sin/cos inequalities with parameters go to the ledger.
- **ℂ kernels with parameters**: real only; complex goes to the ledger.
- **Transcendental constants**: polynomial level only. Kernel levels of degree ≥ 3 stay refused, because a root cannot yet sit inside an expression (ledger).

### Single kernels with parameters (`parameters/kernels.ts`)

**Shape** (anything else is refused with a ledger reason):
- one relation c₁·f(L) + c₀ op 0 over ℝ;
- f ∈ {exp, log, sin, cos, |·|, u^{1/q}}, with f(L) the only occurrence of the target;
- the level linear in f(L);
- L = (α·x + β)/δ affine in x;
- every coefficient a polynomial or quotient in the parameters.

**The tree** splits, in order:
1. **The denominators** (≠ 0).
2. **α**: α = 0 makes the relation free of x, and its truth (possibly transcendental, such as e^b = 2) becomes the condition.
3. **The level coefficient a₁**:
   - a₁ = 0 gives the domain of f(L) or ∅;
   - for an order, its sign orients f(L) against τ = −a₀/a₁.
4. **The range of f at τ**, as polynomial conditions on a₀, a₁:
   - τ > 0 ⇔ −a₀·a₁ > 0;
   - |τ| < 1 ⇔ a₀² < a₁²;
   - τ = ±1 ⇔ a₀ ± a₁ = 0.
5. **sign(α·δ)**: it orients intervals and makes the trig period 2π·δ/α positive.

**Simplification:** sibling cases that differ only in the sign of one expression merge (a = 0 and a > 0 become a ≥ 0). Conditions on one expression intersect (a ≠ 0 with a ≤ 0 becomes a < 0).

| Problem | Cases |
| --- | --- |
| e^{ax} = b | b ≤ 0, a ≠ 0: ∅; a = 0, b = 1: ℝ; a = 0, b ≠ 1: ∅; a ≠ 0, b > 0: ln b / a |
| ln x = a | e^a (no case) |
| sin x = a | \|a\| < 1: {asin a, π − asin a} + 2πℤ; a = ±1: ±π/2 + 2πℤ; \|a\| > 1: ∅ |
| sin(a·x) = 1/2 | a = 0: ∅; a > 0 and a < 0: families with period ±2π/a |
| √x = a | a ≥ 0: {a²}; a < 0: ∅ |
| \|x\| = a | a > 0: {±a}; a = 0: {0}; a < 0: ∅ |
| e^{ax} > b, ln x < a, \|x − a\| ≤ b, cos x ≠ a | intervals and periodic arcs with parametric ends |

**Specialization.** The kernel answers specialize to the closed-form slices (`decideAt` uses the generator slice when the target is inside a kernel).

**Verifier changes:**
- Sets are compared by value, so ln 4 / 2 equals ln 2 through the exact log-zero test.
- Transcendental conditions are decided by certified signs.
- One-parameter samples add grid rationals when a condition is not polynomial.

### Transcendental constant coefficients (`parameters/constants.ts`)

**Routing.** A problem with no parameters and no kernel of the target, but with a transcendental number among its coefficients (π, e, ln 2, sin 1, …), is decided as follows:

1. **Indeterminates.** Every maximal number-only subexpression that is not a rational combination becomes an indeterminate cₖ. Coefficients are then polynomials in the cₖ, with exact cancellation.
2. **Signs.** A coefficient's sign comes from `realSign` of its value. An algebraic relation among the constants that no test recognizes ends in a typed work stop, never a wrong answer.
3. **Basis.** Euclid with these zero tests computes gcds at the actual values, which gives a square-free coprime basis.
4. **Isolation.**
   - Sturm sequences, with −prem scaled by a positive multiplier, count real roots between rationals.
   - Bisection from a Cauchy bound (certified enclosures) isolates them; exact rational roots stay rationals.
   - Roots of different basis polynomials are refined apart.
5. **Assembly.** The cells between the roots are assembled as in slice 1.
6. **Answers:**
   - roots of degree ≤ 2 get radical closed forms;
   - higher degrees are `root` values with rational isolating bounds `lo < root < hi`, which `compareValues` uses for order and the wire codec carries;
   - over ℂ, one equation gives the root set of its polynomial.

**Verifier:**
- Each root's bounds isolate exactly its index-th real root, by Sturm counts.
- At rational samples before, between and after the claimed ends, membership equals the problem's truth (certified signs).
- Re-derivation agrees.

**Examples:**
- π·x³ + x − e = 0 gives one real root, 0.8421191… (mpmath).
- x⁵ − π·x + 1 = 0 gives −1.4012416, 0.3193674 and 1.2358080.
- x³ − π·x < 0 gives (−∞, root₁) ∪ (0, root₃).
- x² = π gives {±√π}.

### Shared changes

- `normalizeSet` keeps parametric interval unions and periodic sets in the order they were built, also at the top level. Before this, a single unconditional parametric interval union was sorted by digest.
- `parametric()` covers periodic sets.

### Follow-up ledger

The roadmap now carries "Deferred follow-ups (all gates)". It collects every gate's known follow-ups and this gate's refusals, with their owners.

### Evidence (part B)

- **`parameters/kernels.test.ts`, 16 tests:**
  - the kernel table;
  - monotone inequalities;
  - six ledger refusals;
  - tampering: a widened range case and a negated period;
  - wire replay of parametric closed forms and families;
  - typed stops.
- **`parameters/constants.test.ts`, 9 tests:**
  - roots checked to 7 decimals against mpmath;
  - closed forms and a conjunction;
  - a root set over ℂ;
  - refusals;
  - tampering: shifted bounds, a wrong index and a widened interval;
  - wire replay;
  - typed stops.
- **Intended routing changes in earlier tests.** a·eˣ = 1, sin(a·x) = 1/2 and √(x + a) = 1 are now decided. The routing rows are replaced by still-refused variants: eˣ + a·x = 1, sin x > a and √x + √(x + a) = 1.

## Not in this gate

Every deferred item is in the roadmap's follow-up ledger. In short:
- several-parameter conjunctions, real degree ≥ 3 with several parameters and case emptiness (`EQUATION-SEMIALGEBRAIC1`);
- ℂ exclusions of degree ≥ 3 parametric roots;
- mixed kernels, nested kernels and higher kernel levels with parameters;
- sin/cos inequalities with parameters;
- ℂ kernels with parameters;
- roots inside kernels (a RootOf expression node);
- constants together with parameters;
- automatic target choice.
