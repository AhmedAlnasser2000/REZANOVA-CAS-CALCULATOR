# EQUATION-CERTIFIED-NUMERICS1: Certified Numeric Roots (slice 8, stage 15)

Date: 2026-10-07
Status:
- **PR A (one variable)**: implemented and verified on 2026-10-07 (unit, contract, golden, UI and Playwright evidence; 60-second probe clean).
- **PR B (square systems by Krawczyk)**: planned when PR A merges.

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
