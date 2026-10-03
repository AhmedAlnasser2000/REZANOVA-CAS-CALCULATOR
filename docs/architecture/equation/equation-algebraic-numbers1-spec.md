# EQUATION-ALGEBRAIC-NUMBERS1 — Algebraic Numbers Specification

Date: 2026-10-03
Status: implemented and backend-verified on 2026-10-03; private foundation only, with no production caller.
Gate: backend only, one meaningful milestone.

Dependencies: the [design](equation-reconstruction-design.md) and the exact-algebra substrate from [`EQUATION-EXACT-ALGEBRA1`](equation-exact-algebra1-spec.md).

User decisions for this gate:
- certified complex isolation and RootOf arithmetic are both included;
- commit and push when green;
- the gate is delivered in its own PR after gate 2's PR.

## Outcome

Exact algebraic numbers for the private Equation core:
- factorization over ℚ;
- certified real and complex root isolation;
- RootOf values with refinement, exact decimals, ordering, sign evaluation and field arithmetic.

x⁵ − x − 1 = 0 now has an exact, certified answer: one real root plus two certified conjugate pairs. The old engine returns a bare decimal in exact mode.

## Owned paths

Under `src/lib/symbolic-engine/equation/core/`:

| File | Content |
| --- | --- |
| `algebra/finite-field.ts` | F_p polynomial arithmetic (p < 2^26), extended gcd, powmod, square-free test, distinct-degree factorization, Cantor–Zassenhaus equal-degree splitting (seeded, deterministic) |
| `algebra/hensel.ts` | Quadratic multifactor Hensel lifting (von zur Gathen–Gerhard 15.10) through a balanced factor tree to p^(2^j); product identity checked |
| `algebra/factor.ts` | Factorization over ℤ and ℚ: Yun, then prime choice (fewest modular factors among 3 suitable primes; speed only), Mignotte bound, Hensel lifting, Zassenhaus recombination with lc adjustment, a constant-term filter and trial division; exact reconstruction check |
| `algebraic/real-roots.ts` | Cauchy bound; Vincent–Collins–Akritas bisection with Descartes counts; exact dyadic midpoint roots; Sturm count (sign-correct primitive pseudo-remainders) as an independent completeness check; exact rational evaluation; Descartes bound on any interval |
| `algebraic/complex.ts` | Gaussian integers; fixed-point complex numbers (approximation only); Gaussian Taylor shift |
| `algebraic/complex-roots.ts` | Certified complex isolation (see below) |
| `algebraic/root-of.ts` | `RealRootOf` and `ComplexRootOf` (minimal polynomial plus isolating interval or certified disk); `realRoots`, `allRoots`, `rootsOfIrreducible`; refinement; exact decimals; `compareReal`; `signAtReal` |
| `algebraic/arithmetic.ts`, `shift.ts` | α+β, α−β, α·β, 1/α, −α |

## Methods and certificates

- **Factorization.** Results are primitive, with positive leading coefficient, and irreducible by Zassenhaus completeness. The product reconstructs the input exactly. Zassenhaus recombination is exponential only in the number of modular factors; it is never capped, and van Hoeij remains a recorded future upgrade.
- **Real roots.** Isolation uses rational intervals with a Descartes count of 1, exact points for dyadic rational roots, and a total that equals the Sturm count.
- **Complex roots.**
  - **Approximation.** Bini's Newton-polygon starting points feed a double-precision Aberth iteration. For |z| > 1 the Newton quotient is evaluated through the reversed polynomial, so doubles never overflow. The results are converted to fixed point at precision 64 plus the bit size of the root bound. Uncertified roots get Newton steps; a full fixed-point Aberth pass is the fallback; then precision doubles. All of this is heuristic and makes no claims.
  - **Certificate.** Smale's α-theorem, checked exactly. With D the coefficients of F(A + t), F(t) = 2^(s·n)·f(t/2^s), and N_k = |D_k|², the bound log₂ α ≤ (L₀ − L₁ + 1)/2 + max_k (L_k − L₁ + 1)/(2(k − 1)) is rigorous (L is bit length). Acceptance requires α < 1/8 < α₀ = (13 − 3√17)/4, and then |z − ζ| < 2β gives a radius 2^e.
  - **Completeness.** deg f certified disks that are pairwise disjoint (checked exactly) each contain exactly one root. A disk is classified non-real when it provably misses the real axis. The number of disks touching the axis must equal the real-root count from isolation.
- **RootOf.**
  - Real refinement bisects while keeping the sign change.
  - Complex refinement uses Newton at doubled precision, re-certifies, and accepts the new disk only if it lies inside the old one, so it is the same root.
  - Decimals are exact roundings: the root is refined until both ends of its region round alike.
  - Ordering is exact. Overlapping intervals of the same irreducible polynomial are equal when the overlap still changes sign.
  - `signAtReal` returns 0 exactly when the minimal polynomial divides g; otherwise it refines until g has no root in the interval.
- **Arithmetic.**
  - The resultant candidates are Res_y(P(y), Q(t − y)), Res_y(P(y), Q(y − t)) and Res_y(P(y), y^dq·Q(t/y)). Each is computed at t = 0..deg with the existing `resultantZ`, then interpolated exactly (Newton divided differences, with the interpolation checked). No bivariate ring is needed.
  - The candidates are factored, and their roots are filtered by the image of the operand regions (interval or disk arithmetic). Operands and candidates are refined until exactly one candidate remains.
  - Negation and inverse use P(−x) and the reversed polynomial. The inverse is selected through the product image.

## Acceptance evidence

12 files / 71 core tests pass (`vitest run src/lib/symbolic-engine/equation/core`). They include:

- **Factorization**:
  - xⁿ − 1 for n = 12, 60, 105, giving 6, 12 and 8 factors; Φ₁₀₅ contains the coefficient −2;
  - (x−1)³(x²+1)²(x⁵−x−1) times −6;
  - x⁴+1 and the Swinnerton-Dyer polynomial S₃ reported irreducible;
  - three random degree-10 factors with 100-bit coefficients recovered;
  - rational content.
- **Real roots**:
  - x⁵ − x − 1 to 50 digits, matching an independent mpmath value: 1.16730397826141868425604589985484218072056037152549;
  - all 20 Wilkinson roots;
  - all 50 roots of T₅₀;
  - a Mignotte-style close pair;
  - exact rational roots;
  - x² + 1 with no real roots.
- **Complex roots**:
  - the conjugate pairs of x⁵ − x − 1 match mpmath to 12 digits;
  - x²⁰ − 1: 20 disks, 18 of them non-real;
  - a random degree-60 polynomial with 30-bit coefficients: all 60 roots certified, about 1.1 s for isolation;
  - ±i to 20 digits;
  - i√3 refined to 25 digits.
- **Arithmetic**:
  - √2 + √3 has minimal polynomial x⁴ − 10x² + 1;
  - √2·√3 = √6;
  - √2 − √2 = 0;
  - 1/√2 has minimal polynomial 2x² − 1;
  - ∛2 + ∛2 has minimal polynomial x³ − 16;
  - (√2+i)(√2−i) = 3.
- **Resources**: tiny work or allocation budgets stop isolation with a typed `resource` stop and no value.
- **Rails**: the isolation and no-caps ratchets pass.

TypeScript, scoped ESLint, compartment boundaries (36) and OOE boundaries (8) pass.

## Performance note

Complex isolation for degree 60 went from 22 s to 1.1 s during the gate:
- The first seeding scaled the variable globally, which underflowed low-order coefficients and lost small roots.
- The fix was Bini starting points with reversed-polynomial evaluation.

Further work belongs to `EQUATION-PROOF-PERFORMANCE1`.

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
