# Equation Reconstruction Blueprint

Date: 2026-10-03
Status: user-approved direction; machinery and representation for the private Equation core. Algorithms named here are the intended methods. Each still needs its own gate, with checked identities, before it is claimed.

Companion: [design](equation-reconstruction-design.md), [roadmap](equation-reconstruction-roadmap.md).

Every item below is a published, general method. None is a family matcher. Where a method has a hard worst case, that case is recorded as a future algorithm upgrade, never as a cap.

## A. Exact algebra substrate (`core/algebra/`)

| Machinery | Method | Enables |
| --- | --- | --- |
| Integers and rationals | `bigint`; Lehmer/binary GCD; canonical reduced fractions | Exactness everywhere |
| Modular tools | Arithmetic mod p, Chinese remaindering, rational reconstruction | Controlling coefficient growth in GCD and factorization |
| Univariate polynomials | Dense ascending coefficients; schoolbook, then Karatsuba multiplication | Large degree without slow arithmetic |
| GCD | Modular GCD (Brown), with a subresultant PRS fallback and a Bézout witness | Avoids the coefficient explosion of naive Euclid |
| Square-free decomposition | Yun | Multiplicities and repeated roots |
| Factorization over ℚ | Cantor–Zassenhaus mod p, then Hensel lifting, then Zassenhaus recombination | Exact irreducible pieces |
| Resultants | Subresultants (Brown/Collins) | Elimination and algebraic-number arithmetic |
| Determinants and linear systems | Fraction-free Bareiss elimination | Linear systems and Sylvester matrices without n! expansion |
| Multivariate polynomials | Sparse distributed representation; sparse modular GCD (Zippel) | Parameters and systems |
| Rational functions | Fractions over ℚ(p₁,…,pₘ) | Symbolic parameters |

Hard worst case: Zassenhaus recombination is exponential on rare adversarial inputs, such as Swinnerton-Dyer polynomials. The upgrade path is van Hoeij's LLL-based recombination.

## B. Algebraic numbers

| Machinery | Method |
| --- | --- |
| RootOf | Irreducible polynomial plus an isolating rational interval (real) or box (complex) |
| Real root isolation | Descartes' rule of signs with Vincent–Collins–Akritas bisection, or the continued-fraction variant; Sturm sequences for counting |
| Complex root isolation | Certified subdivision with Pellet-style tests, or Aberth iteration followed by interval certification |
| Refinement | Exact dyadic/rational interval arithmetic, to any requested precision |
| Arithmetic | Minimal polynomial of α+β, αβ, α⁻¹ via resultants, then factor and re-isolate |
| Sign and comparison | Refine until the intervals separate; exact zero test by GCD |
| Radical presentation | Cardano and Ferrari only as an optional *presentation* of RootOf for degree ≤ 4 |

Implemented choices (2026-10-03, [`EQUATION-ALGEBRAIC-NUMBERS1`](equation-algebraic-numbers1-spec.md)):
- Complex isolation seeds Aberth with Bini Newton-polygon points in doubles, using reversed-polynomial evaluation for |z| > 1.
- Each root is certified by Smale's α-test with a rigorous bit-length bound (α < 1/8).
- Completeness comes from deg f pairwise-disjoint disks.
- Real isolation is VCA, cross-checked by a Sturm count.
- Arithmetic uses resultants by evaluation and interpolation.

Hard spot: radicals for solvable quintics and higher need Galois-group computation. This is deferred. RootOf is already exact.

## C. Representation

- **Expression graph.** Hash-consed nodes with canonical child ordering for commutative operators. Equal subexpressions are one node, so deep or repeated compositions cost memory once.
- **Relation problem.** Relations (=, ≠, <, ≤), domain (ℝ or ℂ), target variables, assumptions, a generator table, a constraint store and proof obligations.
- **Transform record.** Input state hash, output state hash, equivalence kind, conditions added or removed, reconstruction map, and the measure that decreased. A replay codec serializes the chain. A verifier separate from the solver replays it.
- **Solution-set algebra.**
  - Finite sets of algebraic numbers.
  - Unions.
  - Case trees under conditions.
  - Periodic families: expression, integer parameters, period lattice, parameter constraints.
  - Parametric sets with free continuous variables.
  - Exact reduced forms: an equivalent relation left unsolved.
  - "Unconfirmed" candidate sets, each with its derivation.

## D. Constraint reasoning

| Machinery | Method |
| --- | --- |
| Range propagation | Forward/backward interval contractors over the graph (HC4 style), repeated to a fixpoint |
| Polynomial sign on an interval | Root isolation, giving sign-invariant intervals (one-dimensional CAD) |
| Monotonicity and injectivity | Symbolic derivative plus root isolation of its numerator |
| Absolute values, piecewise expressions, radicals | Branch manager with lazy splitting: a case is materialized only when propagation cannot decide it |
| Contradiction | An empty interval or inconsistent sign condition prunes the branch immediately |

## E. Generators and algebraization

| Machinery | Method |
| --- | --- |
| Kernel collection | Gather exp, log, trig, radical and absolute-value kernels from the graph |
| Exponent and frequency lattice | Rational-linear dependencies among arguments. e^{ax}, e^{bx} share e^{gx}, with g the rational GCD. For many arguments, use the Hermite normal form over ℤ. The same applies to trig frequencies. |
| Basis choice | Minimize degree, then generator count, then branch complexity |
| Radicals | √f becomes a generator y with y² = f and y ≥ 0, eliminated by resultants, not repeated squaring |
| Trig | Tangent half-angle substitution, with its exceptional points kept as conditions; z = e^{iu} over ℂ |
| Log/exp rewrites | Only under explicit domain guards; log(x²) = 2 log x is never applied blindly |

Later upgrade: the Risch structure theorem decides algebraic dependence of exp/log terms in general.

## F. Inverse relations and families

- **Function metadata**: natural domain, range, monotone intervals, injectivity intervals, period, singularities, and the complete inverse relation with its branch family, for each supported function.
- **Lambert W**: canonical rewrite to u·eᵘ = c. Real branches W₀ and W₋₁; complex branches W_k.
- **Periodic-family intersection** is a linear Diophantine problem, solved by extended GCD and Chinese remaindering.
- **Restriction to an interval** uses exact floor and ceiling of bounds involving π, by certified interval evaluation of constants.

## G. Systems

| Machinery | Method |
| --- | --- |
| Linear systems | Bareiss elimination; parametric solution sets |
| Small nonlinear systems | Resultant elimination |
| Polynomial systems | Gröbner bases: Buchberger with criteria, then F4 |
| Zero-dimensional exact output | FGLM, then the Rational Univariate Representation (all solutions as RootOf of one polynomial) |
| Positive-dimensional systems | Dimension from the Hilbert polynomial; triangular decomposition (regular chains) |
| Real systems with inequalities | CAD with McCallum projection; doubly exponential in variables, which is mathematical reality |

## H. Parameters

Coefficients live in ℚ(p₁,…,pₘ). The solver builds case trees on the conditions that change the answer: a vanishing leading coefficient, discriminant sign, vanishing denominators and branch conditions. Comprehensive Gröbner systems come later.

## I. Verification and certificates

- **Polynomial and algebraic results**:
  - product reconstruction for factorization;
  - quotient/remainder and Bézout identities;
  - sign-variation counts for root isolation;
  - minimal-polynomial membership for roots.
- **Transcendental results**: the transform log is the proof. Substitution is checked exactly where decidable. Otherwise the candidate gets interval evidence plus the status "unconfirmed".
- **Mutation tests** change a coefficient, sign, condition or branch and require rejection.

## J. Search control

Each transform declares its progress measure. A visited set is keyed by the canonical state hash. Iterative deepening runs under the shared work/allocation budget and Stop.

## K. Certified numerics (last)

- Interval Newton or the Krawczyk operator proves that a box holds exactly one root of a transcendental equation on a bounded interval.
- Interval evaluation excludes the rest of the interval.
- Arithmetic is arbitrary-precision dyadic.
- Results are typed as numerical, never presented as symbolic closure.

## V6 result-contract outline

V6 is designed in `EQUATION-RESULT-CONTRACT1`. It is outlined here only to fix the semantics:

- outcome taxonomy;
- solution-set node kinds (finite algebraic set, family, parametric set, case tree, reduced form, unconfirmed set);
- RootOf with isolation data;
- integer and continuous parameters with constraints;
- retained source exclusions;
- a provenance summary;
- size handling that reports overflow as a resource condition.

It contains no partial-root payload.

## Slice prerequisites

| Slice | New machinery |
| --- | --- |
| 1. Univariate polynomial and rational equations over ℝ and ℂ | A (univariate, factorization), B, C, I, J |
| 2. Generators (exp, log, power) | E, F (exp/log) |
| 3. Absolute values, radicals, constraints | D, radical generators |
| 4. Trig and periodic families | F (families, Diophantine, interval restriction), trig part of E |
| 5. Composition | D over C's graph |
| 6. Systems | A (multivariate), G (resultants, Gröbner, RUR) |
| 7. Real semialgebraic systems | G (CAD) |
| 8. Certified numerics | K |

## References and revision policy

Standard references, used as the method sources:

- von zur Gathen and Gerhard, *Modern Computer Algebra*: modular GCD, factorization, Hensel lifting, resultants.
- Collins and Akritas (1976) on Descartes-based real root isolation.
- Basu, Pollack and Roy, *Algorithms in Real Algebraic Geometry*: sign determination, CAD.
- Cox, Little and O'Shea, *Ideals, Varieties, and Algorithms*: Gröbner bases.
- Faugère's F4 and FGLM papers.
- Rouillier on the Rational Univariate Representation.
- Moore, Kearfott and Cloud, *Introduction to Interval Analysis*: interval Newton, Krawczyk.
- Corless et al., "On the Lambert W function".

Each implementation gate records the specific statements it relied on. This blueprint changes only through a recorded decision.

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
