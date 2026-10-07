# EQUATION-CERTIFIED-NUMERICS1: Certified Numeric Roots and Systems (slice 8, stage 15)

Date: 2026-10-07
Status:
- **PR A (one variable)**: implemented and verified on 2026-10-07 (unit, contract, golden, UI and Playwright evidence; 60-second probe clean).
- **PR B (square systems)**: implemented and verified on 2026-10-07 (unit, contract, golden, UI and Playwright evidence; 60-second probe clean). Scope agreed on 2026-10-07: Krawczyk, a floating-point Newton guess with ε-inflation proven once exactly, HC4 contraction and mean-value ranges; further techniques are listed in the roadmap's "After this roadmap" section. This completes the stage.

Stage 15 of the [roadmap](equation-reconstruction-roadmap.md); renumbered from 16 by user decision on 2026-10-07 (the roadmap records the order change). **No code from the old Equation engine is used**, and New Integration is not touched.

## User decisions (2026-10-07)

- **Representation**: a new schema-7 root binder `isolated-real-root`, the unique zero of f on a rational interval [lo, hi] where f is proven defined and strictly monotone. It is shown as "x ≈ 0.739085" with the definition row "the root of x − cos(x) = 0 between 1/2 and 3/4"; copying gives that exact definition.
- **Scope**: one variable in PR A; square systems (n equations in n unknowns, any n, no cap) in PR B. Over- and under-determined systems, tangent roots and non-polynomial systems with inequalities are refused honestly and recorded in the ledger.
- **Infinitely many roots without closed forms** (eˣ + sin x = 0): refused, naming the fix: add a range row such as −10 ≤ x ≤ 0. With range rows, every root in the range is given and completeness is proven.
- **Range input**: ordinary rows (−10 ≤ x ≤ 0, x > 1); no new UI.
- **Verified line**: "✓ Certified" for any answer with a numeric root: "Each root was proven to be the only one in its interval (the expression changes sign there and is strictly monotone), the digits shown are correct, and no other solutions exist." Exact answers keep "✓ Verified exactly".

## The value

- **Node** (`core/representation/expression.ts`): an expression leaf `{ kind: 'isolated', expr, lo, hi, loSign }`. `expr` is f written in the bound variable `ξ` (users cannot type it), so the same root found from x or replayed from a binder symbol is one interned node. It is real and total by construction, and has no children, so substitution and free-symbol walks never look inside.
- **Why an expression node, not a point value**: the zero finder and the one-variable set builders pass solutions as expressions; as a leaf, a numeric root flows through sets, intervals, wire and presentation unchanged.
- **Enclosure** (`representation/enclosure.ts`, `isolatedBox`): a safeguarded secant step inside the current bracket, with the sign at each new point decided by `enclose` on f at a rational; trisection is the fallback, so every step progresses. The best bracket is cached per node. Refinement runs under the budget only.
- **Exact order** (`representation/real-order.ts`, `isolatedSign`): c·z + t against a number-only t is decided exactly: compare with lo and hi first, and inside the interval sign(f(−t/c)) decides (0 means equal). Equality to a closed form never depends on precision.
- **realSign** now tries one cheap enclosure before exact evaluation, which avoids high-degree algebraic arithmetic on values such as 2^(9/8) + 3^(9/8).
- **Evaluate** reports the node as not exact; the constraints tower refuses it as a generator.

## The certificate (`core/numeric/isolated.ts`)

`certifyIsolated(store, f, x, lo, hi)` proves that f has exactly one zero on [lo, hi]:
1. **Definedness**: every domain-sensitive kernel argument (`domainNeeds`: logs and even roots > 0, negative and fractional powers and |u| ≠ 0, asin/acos in (−1, 1), tan with cos u ≠ 0, W₀ > −1/e, W₋₁ in (−1/e, 0)) stays strictly inside its domain on the interval, by certified ranges, and exactly at the ends.
2. **A sign change**: f(lo) and f(hi) have exact, opposite signs.
3. **Strict monotonicity**: the certified range of f′ excludes 0 with the direction of the change.

Ranges are coarse on wide intervals, so the interval is subdivided at dyadic midpoints until every part is proven; an exact failure at a midpoint refutes at once. A failed check is a typed `verification-failed` refutation.

## Finding roots (`core/composition/zeros.ts`)

- `rangeZeros` already cut the line at domain breakpoints, proved pieces free of zeros with certified ranges, and proved monotonicity with derivative ranges. At a sign change with no exact candidate it now returns an isolated zero (`isolateZero`, which returns a rational instead when an inner point is exactly the zero). Exact candidates always win, so closed forms never become numeric.
- **Range rows** (`rangeBound`): an order row whose difference is a·x + b (a a nonzero number, b constant) bounds the search box. Its constants become breakpoints and pieces outside are skipped. `closed-form-set.ts` passes the box through `zerosOf` in `generators/inversion.ts`. The final set is still intersected with every relation.
- **Tails**: an unbounded tail is settled when no trig kernel argument is unbounded there, when the range of f on a far tail (|x| ≥ 1000 or ≥ 10⁶) excludes 0, or when the limit exists. An unsettled tail is refused with a typed `specific` refusal ("infinitely many roots without a closed form as x → −∞; add a range row such as −10 ≤ x ≤ 0"). The flag, not the text, keeps the reason through callers.
- **Routes now reaching the finder**: independent exponentials (2ˣ + 3ˣ = 10), radical towers with transcendental constants (√x + √(x+1) = ln 5), mixed kernels (cos x = x, eˣ + x³ = 5, eˣ + ln x = 1), and inequalities whose boundaries are numeric (eˣ + sin x > 0 with x ≥ −10).

## Independent verification (`core/numeric/cover.ts`)

`verifyNumericAnswer` runs after the slice's own evidence:
1. **Every isolated node** in the answer re-proves its certificate and orientation.
2. **Completeness, for one equation plus constant range rows**: an exclusion cover. Each claimed root gets an interval holding exactly one zero (numeric roots: their own interval, certified against the problem's f; exact roots: a small interval where f′ keeps one sign, `uniqueAround`). Every gap inside the range is bisected (tails extended outward) until the certified range of f excludes 0 or f is undefined there. A zero found exactly at a split point, or opposite exact signs on a piece where f is proven continuous, is an unclaimed zero and refutes the answer. This runs under the budget only.
- The residual-enclosure check is skipped for values containing isolated nodes (the certificate replaces it).
- Other shapes (inequalities, several equations, an exact root with f′ = 0) keep step 1 plus the existing re-derivation; see the ledger.

## Contract (schema 7)

- **Binder** (`src/types/calculator/canonical-result-equation.ts`): `{ kind: 'isolated-real-root'; symbol; expression; lo; hi }`. The expression is written in the binder's own symbol.
- **Validation** (`src/lib/result-contract/current/equation-schema.ts`): exact keys, real domain only, the expression mentions its symbol, rational constant bounds, lo < hi.
- **Projection and replay**: `Projector.isolated` in `equation/result.ts`; `result-read.ts` rebuilds the node and re-checks the certificate with `certifyIsolated`.
- MathJSON writes `['IsolatedRoot', …]`; wire encodes `['i', expr, lo, hi, loSign]` (transport only).

## Presentation

- Certified decimals are refined until both ends of the enclosure round alike; order is by certified comparison.
- The definition row reads "the root of f = 0 between lo and hi", with lo and hi the binder's rationals.
- The presentation core is shared across Exact, Decimal and Both (keyed by input document), so switching styles does not rebuild it.
- `src/lib/new-equation/verification.ts` gives the "Certified" headline; `NewEquationAnswer.tsx` explains the range row in the plain refusal text.

## Evidence

- `core/numeric/isolated.test.ts` and `core/numeric/corpus.test.ts`: decimals checked to 24 digits against mpmath references (cos x = x; sin x = x/2 with 0 exact; eˣ + x³ = 5; 2ˣ + 3ˣ = 10 and 6; eˣ + ln x = 1; √x + √(x+1) = ln 5; eˣ + sin x = 0 on [−10, 0] with four roots), tamper tests (a dropped root, a root moved to an interval without a sign change) and the refusal without a range.
- Contract: validator and replay tests, golden case `new-equation-certified-root`, regenerated print-hygiene baseline (additions only).
- UI: the Certified line, the definition row, copy, the refusal wording; Playwright `e2e/new-equation.spec.ts` on a preview build (cos x = x, and eˣ + sin x = 0 with −10 ≤ x ≤ 0).
- **60-second probe** (`tools/equation-slow-case-probe.mjs`, including about 3.4 s of process start): cos x = x 3.6 s, 2ˣ + 3ˣ = 6 5.0 s, eˣ + x³ = 5 3.8 s, eˣ + sin x = 0 on [−10, 0] 5.6 s, eˣ + sin x > 0 with x ≥ −10 5.5 s, eˣ + sin x = 0 refused in 3.4 s.

## Limits recorded in the ledger

tan inside mixed expressions (tan x = x), definition rows that show the normalized expression, numeric roots over ℂ, the cover's scope (one equation plus range rows), the skipped cover beside an exact root with f′ = 0, tangent roots, and the systems classes PR B does not take.

## PR B: certified square systems

### User decisions (2026-10-07)

- **One binder per point**: `isolated-real-point` with one symbol per coordinate, the equations once and the box; one definition row per point.
- **Bounds**: HC4 derives what it can; only unknowns still unbounded are refused, by name, with the range row to add.
- **Tangent (singular) solutions**: an honest typed refusal once detected.
- **Range rows on exact polynomial systems**: left to stage 16 `EQUATION-SEMIALGEBRAIC1` (inequalities in a system).

### Fix folded in (B0)

A system that exact elimination reduces to one certified root (y = sin x, x + eʸ = 2) decided in 0.2 s but its verification refined forever: `holdsAt` asked for the sign of a value that is exactly 0. Such values now vanish by identity in the root's bound variable (`core/numeric/identity.ts`: identically 0, or a nonzero numeric multiple of the defining expression, checked with numeric multiples distributed over sums), else a certified enclosure must prove them nonzero, else verification fails with a typed reason. Elimination also distributes after substituting, so −(y − z) leaves z isolable.

### Substrate (B1)

- `composition/range.ts`: `rangeOverBox` (each variable in its own interval) and `rangeNodes` (every node's range); `rangeOf` is its one-variable case.
- `core/numeric/contract.ts`: HC4 revise, a forward pass of certified ranges and a backward projection through sums, products, integer powers (both signs for even ones), exp and log. Other kernels pass the whole line back, which is sound. It is repeated over the system while a variable shrinks by a tenth or gains a finite end. An empty intersection proves no zero. Also the mean-value form f(m) + Σ ∂ᵢf(X)(Xᵢ − mᵢ), intersected with the natural range.
- `core/numeric/interval.ts`: closed rational intervals rounded outward to 2^−bits, interval matrix products, exact conversion of doubles, and a floating-point approximate inverse (a preconditioner only).

### The value and the certificate (B2)

- **Node** `isolated-point` (`representation/expression.ts`): coordinate `index` of the unique solution of `system` (written in ξ1…ξn) in a rational `box`; a real, total leaf, so the coordinates of one point share their system and box.
- **Krawczyk test** (`core/numeric/krawczyk.ts`): on a bounded box X where every kernel is defined and continuously differentiable (`domainNeeds` over the box), with m the midpoint, J(X) the certified Jacobian ranges and Y any matrix, K(X) = m − Y·F(m) + (I − Y·J(X))·(X − m).
  - Every solution in X lies in K(X), so K(X) ∩ X = ∅ proves none.
  - K(X) ⊂ int X proves exactly one.
  - Y comes from a floating-point inverse of the midpoint Jacobian, converted exactly; it only makes the test likely to succeed.
  - All arithmetic is rational, rounded outward.
- **Refinement**: coordinates are refined by Krawczyk contraction (quadratic near a regular solution), after the box is re-proven. The refiner is installed into `enclose`, so the representation layer does not import composition.
- **Order**: tuples built from certified points are ordered by their boxes (exact solutions first). Two solutions can share a coordinate, which no refinement could ever separate; display order follows the same rule.
- **Schema 7**: `{ kind: 'isolated-real-point'; symbols; equations; box }`, validated (fresh symbols, at least two; as many equations as symbols, each symbol used; rational lo < hi; real domain), projected once per point, and replayed with the certificate re-proven (`result-read.ts`).

### Solving (B3, `core/numeric/systems.ts`)

- **Search box**: range rows (`systemRanges`: a·t + b < 0 or ≤ 0 on one target with constant b, the tighter bound per side), then HC4 over the rest of the space (sin(x + y) = x, cos(x − y) = y needs no rows: x, y ∈ [−1, 1]). Unbounded unknowns get a typed `specific` refusal: "the solutions are not bounded in x and y; add range rows for x and y, such as −10 ≤ x ≤ 10".
- **Branch and prune**, each box in turn:
  1. dropped when a kernel is undefined throughout it, or when some equation's range (natural ∩ mean-value) excludes 0;
  2. contracted by HC4, then by K(X) ∩ X;
  3. Krawczyk proves no solution, or exactly one (the box becomes a root box);
  4. otherwise floating-point Newton from the centre, allowed to settle anywhere in a margin around the whole search box. Contraction can leave a piece too thin for its own test, and a solution can sit on the search box's face, as x² + y² + z² = 3 does at (0, 0, ±√3). A converged guess becomes a root box by ε-inflation (2^−40, then 2^−60 of its scale) and the exact test, grown ×16 while the test holds and given simple rational ends. A simple rational point that solves every equation exactly stays exact: (0, 0) for eˣ + sin y = 1, eʸ − sin x = 1.
  5. otherwise split across the widest side at 33/64, so no split face lands on a simple root.
  - Overlapping root boxes are merged when Krawczyk proves their hull, and contracted apart otherwise.
- **Tangent solutions**: a box shrinking to 2^−40 of its scale undecided holds a tangent (singular) solution, refused honestly. eˣ + sin y = 1, eʸ + sin x = 1 has the Jacobian [[1, 1], [1, 1]] at (0, 0).
- **Range rows**: solutions outside strict rows are dropped. A solution on a row's boundary that enclosures cannot settle is refused.
- **Routing** (`systems/solve.ts`, `systems/eliminate.ts`):
  - range rows are accepted in systems with kernels; other inequalities stay with `EQUATION-SEMIALGEBRAIC1`;
  - exact elimination runs first, and a square remainder with no isolable target goes to the solver;
  - eliminated targets are rebuilt by substitution (dropped where undefined, filtered by their rows);
  - non-square remainders are refused ("2 equations in 3 unknowns … square systems").
  - The one-target problem receives the range rows on its target.

### Independent verification (`core/numeric/cover-box.ts`)

1. Every certified point re-proves its Krawczyk test.
2. Each claimed point satisfies the problem's own rows: equations vanish by identity in the point's bound variables (an equation is a numeric multiple of one of the point's equations); `holdsAt` now reads < and ≤ rows as well.
3. For a system decided wholly numerically (no exact elimination), an exclusion cover:
   - the search box is recomputed;
   - claimed boxes must be pairwise disjoint, and an exact point gets its own Krawczyk box;
   - every claimed point satisfies the range rows;
   - every other part of the box is excluded by the same tests as the solver, but without guesses;
   - a part where Krawczyk proves a solution outside every claimed box is "an unclaimed solution", unless that solution violates the range rows.
   - Re-derivation is then not needed.
- Systems with exact elimination first keep step 1, step 2 and re-derivation.

### Presentation

- "(x, y) ≈ (0.935082, 0.998020)" with one definition row per point: "the solution of y = cos(x − y), sin(y + x) = x with 5/6 ≤ x ≤ 1, 7/8 ≤ y ≤ 10/9".
- Each equation is read as a relation: canonical term order (the same for every binder), the constant moved right, negative terms moved right when there is no constant.
- A point used inside other values gets a definition row of its own symbols.
- "✓ Certified": "Each solution was proven to be the only one in its box (an interval Newton test, the Krawczyk test, checked exactly), the digits shown are correct, and no other solutions exist."

### Evidence (PR B)

- **Tests**:
  - `core/numeric/systems-mixed.test.ts` (B0);
  - `core/numeric/contract.test.ts` (B1);
  - `core/numeric/systems.test.ts`: 25-digit references from mpmath, polished at 60 digits with residuals below 10⁻⁶⁰:
    - eˣ + sin y = 1, eʸ − sin x = 1 on [−5, 1]² (three solutions, the exact (0, 0));
    - sin(x + y) = x, cos(x − y) = y;
    - x² + y² + z² = 3, eˣ − yz = 1, sin y + xz = 1/2 (two solutions);
    - x² + y² + z² = 3, eˣ − yz = 1, sin y + xz = 0, whose solutions (0, 0, ±√3) lie on the face of the contracted search box;
    - the unbounded and tangent refusals;
    - tamper tests: a dropped point, a box without a solution, a box with two.
- **Service and contract**: rendering, the "Certified" headline, binder validation.
- **Golden**: case `new-equation-certified-system`; print-hygiene baseline 53 cases, additions only.
- **Playwright**: the system answer, Certified, copy.
- **60-second probe**, including about 3.4 s of process start:

  | Case | Time |
  |---|---|
  | eˣ + sin y = 1, eʸ − sin x = 1 with ranges | 6.1 s |
  | sin(x + y) = x, cos(x − y) = y | 3.5 s |
  | the 3-unknown system | 6.5 s |
  | (0, 0, ±√3) on the box face | 5.0 s |
  | the unbounded refusal | 3.4 s |
  | the tangent refusal | 4.1 s |
  | y = sin x, x + eʸ = 2 | 3.7 s |

### Limits recorded in the ledger (PR B)

- over- and under-determined non-polynomial systems;
- tangent (singular) solutions;
- non-polynomial systems with other inequalities;
- range rows on exact polynomial systems (stage 16);
- conditions and ≠ in systems with kernels;
- systems with kernels over ℂ;
- a solution exactly on a range boundary;
- the cover's scope (systems decided wholly numerically);
- coordinates that are exact but not part of an exactly rational point, such as (0, 0, ±√3), shown numerically.

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
