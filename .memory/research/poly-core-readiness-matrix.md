# POLY-CORE-AUDIT1 Readiness Matrix

milestone: `POLY-CORE-AUDIT1`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Summary

`POLY-CORE-AUDIT1` confirmed that Calcwiz had a bounded app-owned one-variable polynomial substrate, but not a broad polynomial algebra engine.

`POLY-RAT-CORE0` has since promoted polynomial division, GCD, primitive normalization, coefficient arrays, and exact rational-function normalization into shared substrates. The polynomial substrate remains `ready-with-adapter` because square-free factorization, resultants, broad partial fractions, Grobner/elimination, and exact coefficient-domain policy are still not present.

No polynomial behavior was added in this milestone.

## Current Shipped Surface

| Area | Status | Current Support | Boundaries |
| --- | --- | --- | --- |
| Exact rational scalar arithmetic | `ready-with-adapter` | `ExactScalar` supports normalized integer numerator/denominator arithmetic for add, multiply, divide, negate, node readback, and numeric conversion. | Number-backed only; no bigint, overflow policy, coefficient-domain gate, algebraic-number field, or interval scalar model. |
| One-variable polynomial parsing | `ready-with-adapter` | Parses bounded one-variable ASTs with exact integer/rational coefficients, addition, subtraction, negation, multiplication, division by scalar, and nonnegative integer powers up to caller caps. | Rejects decimals, multivariable terms, non-polynomial functions, negative/fractional powers, division by symbolic terms, and degree overflow. |
| Degree caps | `ready` | Callers must pass a max degree, and multiplication/parsing stop when the cap is exceeded. | No dynamic degree policy or complexity budget beyond caller-owned caps. |
| Polynomial addition/scaling/multiplication/division/GCD | `ready-with-adapter` | Shared exact arithmetic over sparse degree maps supports add, signed add/subtract, scale, multiply under a max-degree cap, division with remainder, and monic Euclidean GCD. | No square-free factorization, resultant, or factor-domain abstraction. |
| Coefficient access and degree facts | `ready` | Shared helpers expose coefficient lookup, degree, leading coefficient, and constant term. | Zero-polynomial degree is currently represented as `0`; no special `-Infinity` degree model. |
| Node and LaTeX readback | `ready-with-adapter` | Shared conversion rebuilds canonical Compute Engine AST nodes and LaTeX. | Formatting is CE-mediated and not a formal canonical string contract. |
| Quadratic discriminant | `ready-with-adapter` | Exact discriminant is available for degree-2 polynomials. | Not a general polynomial invariant layer. |
| Bounded factorization | `ready-with-adapter` | Existing factor/solve consumers use bounded rational-root, biquadratic, quadratic-pair, and symbolic-engine factoring paths. | Not a general factorization engine; square-free factorization and coefficient-field-aware factorization are blocked. |
| Rational normalization and cancellation | `ready-with-adapter` | `rational-function-core` provides shared polynomial quotient cancellation while `symbolic-engine/rational.ts` preserves shipped factor-map behavior. | Broad partial fractions and rational integration adoption remain blocked. |
| Numeric roots | `ready-with-adapter` | `polynomial-roots.ts` provides current numeric fallback behavior for supported shipped degree families. | Numeric fallback is not exact solving, and exact root expansion remains out of scope. |
| Equation-solve consumers | `ready-with-adapter` | Existing equation/factor solve surfaces reuse bounded polynomial support for shipped exact and numeric behaviors. | Exact solving does not imply broad algebraic closure, resultants, or elimination. |

## Future Prerequisite Readiness

| Future Need | Status | Decision |
| --- | --- | --- |
| Polynomial gcd/lcm as shared primitive | `ready-with-adapter` | Monic polynomial GCD is shared; numeric integer lcm remains helper-level where needed. |
| Polynomial division/remainder | `ready` | Shared quotient/remainder division is available for exact one-variable polynomials. |
| Square-free factorization | `blocked` | Needed before broader exact factorization or robust repeated-root handling. |
| Resultants | `blocked` | Needed before elimination-style exact solving; not present today. |
| Partial fractions | `ready-with-adapter` | Proper distinct-rational-linear readiness exists internally; repeated factors, irreducible quadratics, and integration adoption remain blocked. |
| Grobner/elimination | `defer` | FriCAS-context research says this belongs behind stronger polynomial algebra, exact scalar, and coefficient-domain readiness. |
| Exact scalar use for future matrix work | `ready-with-adapter` | Current rational scalar type is useful context, but exact linear algebra needs explicit coefficient-domain gates and stronger scalar policy first. |
| Rational integration prerequisites | `ready-with-adapter` | `POLY-RAT-CORE0` provides the first substrate slice; `INT-RAT1` must still consume it explicitly and stop on broader blocked cases. |

## Consumer Map

| Consumer | Current Relationship |
| --- | --- |
| `src/lib/polynomial-core.ts` | Canonical bounded one-variable exact polynomial substrate. |
| `src/lib/polynomial-factor-solve.ts` | Bounded exact factor/solve adapter over the polynomial substrate and local solve helpers. |
| `src/lib/polynomial-roots.ts` | Numeric fallback path, not an exact polynomial algebra layer. |
| `src/lib/symbolic-engine/factoring.ts` | Bounded factorization adapter; should not grow into broad factorization without a core milestone. |
| `src/lib/symbolic-engine/rational.ts` | Adjacent rational-normalization/cancellation substrate; useful but not yet a full rational-function core. |
| `src/lib/symbolic-engine/patterns.ts` | Pattern recognition consumer; should keep polynomial use bounded and explicit. |
| Calculus integration/limits | May reuse readiness facts, but must not hide missing partial-fraction or polynomial-division work inside calculus code. |
| Future exact linear algebra | Must wait for exact scalar/coefficient-domain decisions before `MATRIX-EXACT0`. |

## Sequencing Decision

`POLY-CORE-AUDIT1` keeps `polynomial-core` at `ready-with-adapter`.

The next native sequence is:

1. `INT-CANDIDATE2` - candidate metadata and dependency-gated integration attempts, without new antiderivative families.
2. A later polynomial-core foundation pass only if `INT-CANDIDATE2` proves partial fractions, polynomial division, gcd, or exact scalar gates are immediate blockers.
3. `MATRIX-EXACT0` remains deferred until exact scalar readiness and coefficient-domain ownership are explicit.
