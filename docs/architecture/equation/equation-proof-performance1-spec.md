# EQUATION-PROOF-PERFORMANCE1: Measured Hot Paths and Fast Verification (gate 12)

Date: 2026-10-04
Status:
- **Part A (benchmark corpus, cheap cost accounting, fixed-point enclosures, per-store caches)**: implemented and backend-verified on 2026-10-04; private, no production caller.
- **Part B (certificates-first verification, slice hot paths)**: implemented and backend-verified on 2026-10-04, in the same PR. This completes the gate.

Gate: backend only. Stage 12 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies: every earlier gate, through [`EQUATION-SYSTEMS1`](equation-systems1-spec.md). No dependency, schema, workspace or production caller is added. **No code from the old Equation engine is used**. Its inventory ([baseline](equation-reconstruction-inventory.md)) supplies only the 50 case definitions of the corpus.

## User decisions (2026-10-04)

- **Scope**: a performance gate for everything built so far (slices 1–6 and the parameters gate).
- **Verification, certificates first**:
  - every independent check stays (substitution, counts, cofactor identities, sampling, Sturm bounds, transform replay);
  - the second full re-derivation is dropped only where independent evidence already proves completeness, with each removal justified here (part B).
- **Targets, on a fixed corpus**:
  - no corpus case slower than before;
  - the slowest cases at least 3× faster: the depth-25 sin and ln chains, the generators depth-25 chain, the quintic with a parameter, C3, the general quadratic and the degree-100 verification;
  - every old-engine baseline case decided and verified in under 1 s on this machine.
- **Techniques**:
  - algorithmic fixes;
  - per-store caching of pure results.
  - Rust/WASM is out. The user asked what it would offer: faster bigint inner loops, at the cost of a second toolchain, and it would not fix redundant work.
- **Delivery**: one PR with two commits, continuing to part B without stopping.

## Corpus and runner (`core/bench/`)

- **`corpus.ts`** holds the cases. Each case gives its MathJSON, optional targets and domain, and the expected outcome kind.
  - **The 50 old-engine baseline cases**: P1–P11, R1–R3, Q1–Q2, S1–S4, A1–A4, E1–E9, T1–T7, C1–C7, M1, N1–N2. C4, cos⁷ x = ½, is empty: the range of cos⁷ is [0.70, 0.76]. N1 and N2 are `incomplete-implementation` (certified numerics, slice 8).
  - **Composition depth evidence**: sin and ln(1 + ·) chains at depths 3 and 25; an arctan chain; sin²⁵ x + x = 0; the alternating exp/ln chain of depth 25; atan x + atan 2x = π/4.
  - **Parameters gate**: a·x² + 2x + 1, e^{ax} = b, sin(ax) = ½, π·x³ + x − e.
  - **Systems gate**: x² + y² = 5 with x·y = 2; Katsura-3; the circle; a linear system with two parameters; eˣ + y = 3 with y = 1.
- **`bench.test.ts`**:
  - **Always on**: every case decides with its expected kind, and every `solved`/`empty` outcome passes its verifier. This is the "no correctness regression" evidence of the corpus.
  - **With `EQUATION_BENCH=1`**: medians of decide and verify, measured separately, each run in a fresh store (5 runs for cases under 1 s, 3 for slower ones). It prints a markdown table.

  The benchmark is off by default, as resource-safe verification requires.
- **Before** was measured on unchanged `main` (`7f98dc5`), in a separate worktree with the same corpus files. **After** was measured on this branch. Both were run in the same container, one after the other, with `--maxWorkers=1`.

## Profiles (before)

The two depth-25 chains, profiled with `node --cpu-prof` on an esbuild bundle of the decision, agree:

| Self time | Cause |
| --- | --- |
| 28–35% `bitLength` | `ExecutionContext.charge` called `limbs`, which converted every bigint to a hex string just to charge the work budget |
| 30–40% `igcd`/`idivmod` | gcd normalization of every rational term in the enclosure series (log, atanh, exp, asin, atan, sin, cos) |
| 96% inclusive in `enclose` | the same atoms were enclosed again and again by `realSign`/range checks within one decision, then again in the verifier's re-derivation |

## Method (part A)

### 1. Cost accounting without string conversion (`algebra/integer.ts`)

- **`limbs(v)`** charges work and allocation by size. It is now:
  - 1 below 2⁶⁴;
  - otherwise the smallest power of two 2ʲ with |v| < 2^(64·2ʲ), found by comparing v with a cached ladder of powers (positive and negative, so no negation is allocated).

  This is within a factor of 2 of the exact limb count. Tiny budgets still stop with typed `work` stops: a test whose budget the cheaper charging now satisfied had its budget lowered, and still stops.
- **`bitLength`** keeps its exact contract for algorithmic uses (bounds, complex isolation).

### 2. Dyadic rationals and fixed-point series (`algebra/rational.ts`, `representation/enclosure.ts`)

- **`rDyadic(n, k)`** builds n/2^k by stripping trailing zero bits, so no gcd is taken. Outward rounding (`down`/`up`) uses it, and it returns an already-dyadic value of the right precision unchanged.
- **sin y and cos y for |y| ≤ 1** are computed in fixed point with U = W + 16 fractional bits: integers only, with one rational at the end. The error budget, in units of 2^−U, is written next to the code:
  - truncating y and y² costs one unit each (sin, cos and the series in y² are 1-Lipschitz there);
  - each term is truncated once, and earlier errors shrink by y²/dₖ ≤ ½, so each term is off by at most 2 units;
  - the alternating tail is below the first omitted term.

  The result is the sum ± (2·terms + 8) units. Larger |y| keeps the rational series.
- **Rationals are a class** (`RationalValue`, frozen), and `isRational` is an `instanceof` check instead of a registry lookup.

### 3. Shared and cached work

| Cache | Key | Why it is safe |
| --- | --- | --- |
| `enclose` boxes | store → precision → node | a box is a pure fact of a node at a precision; a later question, or a verifier on the same store, reuses it |
| `realSign` | store → node | an exact sign is a pure fact |
| π (Machin) | context → 64-bit precision step | computed once per context and rounded outward to the request |
| `refineReal` | context → isolating-interval object | a narrower cached refinement is still an isolating interval of the same root |

- **Determinism**: every cache is scoped to a store or to an execution context, never shared between contexts. The work charged (hence any typed stop) depends only on that context's own history. A test checks that the same question charges the same work in two fresh contexts.
- **Refinement without gcds**: `refineReal` bisects on unreduced numerators over B·2^m, where B is the product of the end denominators, and builds rationals only at the end.

## Results (part A)

The medians, in ms, for decide plus verify, before and after part A:

| Case | Before (ms) | After A (ms) | Speed-up |
| --- | ---: | ---: | ---: |
| P1 | 6.8 | 7.5 | 0.9× |
| P2 | 7.9 | 6.1 | 1.3× |
| P3 | 6.0 | 4.8 | 1.2× |
| P4 | 7.4 | 6.7 | 1.1× |
| P5 | 31.7 | 22.8 | 1.4× |
| P6 | 6.8 | 5.6 | 1.2× |
| P7 | 9.8 | 8.3 | 1.2× |
| P8 | 9.7 | 5.8 | 1.7× |
| P9 | 12.6 | 8.7 | 1.4× |
| P10 | 43.5 | 39.2 | 1.1× |
| P11 | 40.9 | 30.8 | 1.3× |
| R1 | 5.6 | 4.5 | 1.2× |
| R2 | 74.3 | 57.8 | 1.3× |
| R3 | 7.2 | 5.8 | 1.2× |
| Q1 | 4635.9 | 3681.9 | 1.3× |
| Q2 | 6920.9 | 1568.6 | 4.4× |
| S1 | 92.5 | 55.8 | 1.7× |
| S2 | 36.1 | 20.2 | 1.8× |
| S3 | 110.5 | 50.2 | 2.2× |
| S4 | 1540.4 | 1207.1 | 1.3× |
| A1 | 4.0 | 3.8 | 1.1× |
| A2 | 6.4 | 5.7 | 1.1× |
| A3 | 16.4 | 13.1 | 1.3× |
| A4 | 7.0 | 6.5 | 1.1× |
| E1 | 62.0 | 11.9 | 5.2× |
| E2 | 37.6 | 9.4 | 4.0× |
| E3 | 17.1 | 6.9 | 2.5× |
| E4 | 44.9 | 10.7 | 4.2× |
| E5 | 7.3 | 5.3 | 1.4× |
| E6 | 101.6 | 11.5 | 8.8× |
| E7 | 98.9 | 25.6 | 3.9× |
| E8 | 318.5 | 114.4 | 2.8× |
| E9 | 1.6 | 1.2 | 1.3× |
| T1 | 226.0 | 23.8 | 9.5× |
| T2 | 889.0 | 463.5 | 1.9× |
| T3 | 70.5 | 11.7 | 6.0× |
| T4 | 255.2 | 53.0 | 4.8× |
| T5 | 759.4 | 200.3 | 3.8× |
| T6 | 1275.2 | 67.5 | 18.9× |
| T7 | 1.6 | 1.4 | 1.1× |
| C1 | 3272.4 | 55.0 | 59.5× |
| C2 | 1466.8 | 223.7 | 6.6× |
| C3 | 6955.4 | 110.4 | 63.0× |
| C4 | 203.8 | 18.0 | 11.3× |
| C5 | 2894.4 | 60.2 | 48.1× |
| C6 | 175.6 | 18.1 | 9.7× |
| C7 | 257.1 | 22.9 | 11.2× |
| M1 | 825.9 | 344.4 | 2.4× |
| N1 | 191.6 | 94.5 | 2.0× |
| N2 | 57.4 | 9.4 | 6.1× |
| depth3-ln | 135.9 | 17.9 | 7.6× |
| depth25-ln | 45771.5 | 1096.2 | 41.8× |
| depth3-sin | 4669.1 | 83.1 | 56.2× |
| depth25-sin | 122360.0 | 592.1 | 206.7× |
| depth25-atan | 43.9 | 16.9 | 2.6× |
| depth25-range | 4764.9 | 105.1 | 45.3× |
| gen-depth25-mixed | 165.8 | 23.9 | 6.9× |
| atan-sum | 5188.7 | 2771.1 | 1.9× |
| param-quadratic | 361.0 | 199.8 | 1.8× |
| param-exp | 173.1 | 45.1 | 3.8× |
| param-sin | 273.3 | 24.3 | 11.2× |
| const-cubic | 83.9 | 9.7 | 8.6× |
| sys-points | 22.8 | 14.1 | 1.6× |
| sys-katsura3 | 310.9 | 172.5 | 1.8× |
| sys-circle | 112.9 | 74.2 | 1.5× |
| sys-linear-params | 43.8 | 25.3 | 1.7× |
| sys-kernel | 11.5 | 3.7 | 3.1× |

- **Core suite**: 38 files / 585 tests (1 skipped: the opt-in medians), 41 s wall with `--maxWorkers=2`. Before this gate it was 36 files / 511 tests in 172 s wall.
- **Over 1 s after part A**: Q1 and Q2 (parameters), S4 (radical tower), atan-sum, depth25-ln. These are part B's targets.
- **Noise**: P1 and P4 are within ±10% (single-digit ms).

## Profiles (after part A)

| Case | Top self time | Path |
| --- | --- | --- |
| Q2 | 35% `idivmod`, 16% `limbs` (gcds) | parameter cells → `zerosOf` → `vanishesAt` → certified disk evaluation in rationals |
| Q1 | 12% polynomial `make` (a WeakSet registry), 10% `wordPrimes` (trial division per call) | 343 several-parameter samples, each a slice-1 decision with factorization |
| S4 | 16% `fpDivRem`, 8% `fpPowMod`, 7% `fpMul` | modular factorization inside algebraic-number addition (radical elimination) |
| atan-sum | 23% `idivmod` | `towerNorm` interpolation and exact Bareiss division |
| degree-100 test | 44% Hensel lifting (schoolbook products of ~500-bit coefficients), 15% `limbs`, 20% rational Horner signs; factoring done twice (decision and verifier) | `factorQ` → `henselLift`; `signOf` |

## Method (part B)

### 4. Slice-level hot paths

- **Fixed-point disk evaluation** (`decision/algebraic-coefficients.ts`). f(point) with algebraic coefficients is evaluated by Horner on integers scaled by 2^W, with W = (requested width) + 8 + log₂(degree). Soundness:
  - each truncated centre coordinate moves the centre by less than one unit, so the radius grows by 2 units per rounding (√2 < 2);
  - products bound the radius by |a|·r_x + |x|·r_a + r_a·r_x, using |z| ≤ |re| + |im|, rounded up;
  - the Liouville zero test is unchanged.

  The rational disk helpers stay for the systems gate's coordinate matching.
- **Several-parameter samples** (`parameters/verify.ts`). The grid is {0, ±1, 2, ½}ᵏ (125 tuples for three parameters) instead of 7ᵏ (343). Each case the grid misses gets the first satisfying tuple of the old 7-value grid, so the sampled cases are a superset of before.
- **Polynomial values as a class** (`algebra/polynomial.ts`). Ring membership is `instanceof` plus the ring field, in place of a WeakSet registry. Forged objects are still rejected.
- **Kronecker substitution** (`algebra/polynomial.ts`). Integer polynomials with at least 4 coefficients are each packed into one integer at 2^K per slot (K = bit length of min(len)·max|a|·max|b|, plus 2), multiplied once by the runtime's sub-quadratic large-integer product, and unpacked as signed digits; the final remainder must be zero. This serves Hensel lifting and every ℤ[x] product. Over ℚ, each side is scaled to integers by the lcm of its denominators, multiplied the same way, and divided by the product of the two lcms.
- **Balanced products** (`decision/rational-form.ts`). A product of many factors is formed as a balanced tree, so fast multiplication applies to large halves. Reduced forms (coprime, monic denominator) are canonical, so the grouping does not change the result.
- **Signs at rational points** (`decision/univariate.ts`). P(p/q) for P over ℚ uses the lcm of the coefficient denominators and homogeneous integer Horner, not a rational Horner with a gcd at each step.
- **Factorizations over ℚ** (`algebra/factor.ts`) are kept per context, keyed by the exact coefficients, rebuilt in the caller's ℤ[x] ring, and re-verified by the product identity on every return. A factorization is a pure fact of its input; the slice-1 verifier's leaf re-decision still re-runs its own root assembly and checks.
- **`limbs`** no longer ticks the context: the operation that asked for it charges the work, and the first ladder rungs are built up front.
- **The word-prime table** (`algebra/modular.ts`) is a pure, lazily extended list shared by all contexts. Each yielded prime is charged one fixed work unit, whether or not it was cached, so work stays deterministic.

### 5. Verification policy (certificates first)

A second full re-derivation is dropped only where the independent checks already prove the answer complete:

| Verifier | Independent evidence | Re-derivation |
| --- | --- | --- |
| systems, finite polynomial answers | exact substitution of every point, points pairwise distinct (new), cofactor identities + Buchberger criterion (the basis generates the ideal), Hermite rank/signature = the number of distinct solutions | **dropped**: distinct solutions, as many as there are, are all of them |
| systems, linear: inconsistent / full rank | independent Bareiss rank and consistency; the unique point compared, ≠ atoms checked at it | **dropped** |
| systems, linear: rank r < n | the set satisfies every equation identically; n − r free targets that map to themselves; polynomial values; no ≠ atoms or constraints | **dropped** (the set lies in the (n − r)-dimensional solution space and projects onto all of its free coordinates, so it is all of it); otherwise kept |
| parameters (one or several) | tiling and specialization at samples | **kept**: one sample per cell checks the claimed formula at one point, not on the whole cell (a deviation from the plan, which had listed one parameter as droppable) |
| constants (π, e coefficients) | Sturm isolation of each claimed root, samples between ends | **kept**: a root missed inside a gap does not change the truth at the gap's sample (also a deviation from the plan) |
| systems, infinite or with kernels; generators, constraints, periodic, composition | sampled or member evidence | **kept**; cheaper now through the per-store substrate caches |
| slice 1 | the leaf re-decision is the completeness proof | unchanged |

Caching whole decisions was rejected: re-derivation over a decision cache would be a no-op. Only pure substrate facts are cached: enclosures, signs, π, refinements and factorizations over ℚ. The factorizations are re-verified by their product identity on every reuse.

## Results (part B)

The corpus medians, in ms, for decide plus verify (speed-up = before ÷ after B):

| Case | Before (ms) | After A (ms) | After B (ms) | Speed-up |
| --- | ---: | ---: | ---: | ---: |
| P1 | 6.8 | 7.5 | 7.0 | 1.0× |
| P2 | 7.9 | 6.1 | 6.1 | 1.3× |
| P3 | 6.0 | 4.8 | 5.2 | 1.2× |
| P4 | 7.4 | 6.7 | 3.8 | 1.9× |
| P5 | 31.7 | 22.8 | 11.9 | 2.7× |
| P6 | 6.8 | 5.6 | 2.7 | 2.5× |
| P7 | 9.8 | 8.3 | 4.6 | 2.1× |
| P8 | 9.7 | 5.8 | 3.5 | 2.8× |
| P9 | 12.6 | 8.7 | 5.5 | 2.3× |
| P10 | 43.5 | 39.2 | 15.8 | 2.8× |
| P11 | 40.9 | 30.8 | 19.1 | 2.1× |
| R1 | 5.6 | 4.5 | 3.9 | 1.4× |
| R2 | 74.3 | 57.8 | 28.2 | 2.6× |
| R3 | 7.2 | 5.8 | 4.2 | 1.7× |
| Q1 | 4635.9 | 3681.9 | 367.1 | 12.6× |
| Q2 | 6920.9 | 1568.6 | 256.1 | 27.0× |
| S1 | 92.5 | 55.8 | 25.6 | 3.6× |
| S2 | 36.1 | 20.2 | 13.0 | 2.8× |
| S3 | 110.5 | 50.2 | 32.5 | 3.4× |
| S4 | 1540.4 | 1207.1 | 466.2 | 3.3× |
| A1 | 4.0 | 3.8 | 2.3 | 1.7× |
| A2 | 6.4 | 5.7 | 3.1 | 2.1× |
| A3 | 16.4 | 13.1 | 6.6 | 2.5× |
| A4 | 7.0 | 6.5 | 4.0 | 1.8× |
| E1 | 62.0 | 11.9 | 8.9 | 7.0× |
| E2 | 37.6 | 9.4 | 7.3 | 5.2× |
| E3 | 17.1 | 6.9 | 4.7 | 3.6× |
| E4 | 44.9 | 10.7 | 8.8 | 5.1× |
| E5 | 7.3 | 5.3 | 4.0 | 1.8× |
| E6 | 101.6 | 11.5 | 8.9 | 11.4× |
| E7 | 98.9 | 25.6 | 16.8 | 5.9× |
| E8 | 318.5 | 114.4 | 101.3 | 3.1× |
| E9 | 1.6 | 1.2 | 0.9 | 1.8× |
| T1 | 226.0 | 23.8 | 20.4 | 11.1× |
| T2 | 889.0 | 463.5 | 191.5 | 4.6× |
| T3 | 70.5 | 11.7 | 10.2 | 6.9× |
| T4 | 255.2 | 53.0 | 35.1 | 7.3× |
| T5 | 759.4 | 200.3 | 143.0 | 5.3× |
| T6 | 1275.2 | 67.5 | 65.9 | 19.4× |
| T7 | 1.6 | 1.4 | 1.3 | 1.2× |
| C1 | 3272.4 | 55.0 | 51.9 | 63.1× |
| C2 | 1466.8 | 223.7 | 202.8 | 7.2× |
| C3 | 6955.4 | 110.4 | 97.0 | 71.7× |
| C4 | 203.8 | 18.0 | 17.7 | 11.5× |
| C5 | 2894.4 | 60.2 | 56.2 | 51.5× |
| C6 | 175.6 | 18.1 | 14.8 | 11.9× |
| C7 | 257.1 | 22.9 | 18.0 | 14.3× |
| M1 | 825.9 | 344.4 | 303.5 | 2.7× |
| N1 | 191.6 | 94.5 | 71.7 | 2.7× |
| N2 | 57.4 | 9.4 | 7.9 | 7.3× |
| depth3-ln | 135.9 | 17.9 | 14.2 | 9.6× |
| depth25-ln | 45771.5 | 1096.2 | 1104.6 | 41.4× |
| depth3-sin | 4669.1 | 83.1 | 79.4 | 58.8× |
| depth25-sin | 122360.0 | 592.1 | 604.6 | 202.4× |
| depth25-atan | 43.9 | 16.9 | 15.4 | 2.9× |
| depth25-range | 4764.9 | 105.1 | 98.7 | 48.3× |
| gen-depth25-mixed | 165.8 | 23.9 | 12.0 | 13.8× |
| atan-sum | 5188.7 | 2771.1 | 1766.6 | 2.9× |
| param-quadratic | 361.0 | 199.8 | 69.4 | 5.2× |
| param-exp | 173.1 | 45.1 | 21.0 | 8.2× |
| param-sin | 273.3 | 24.3 | 21.3 | 12.8× |
| const-cubic | 83.9 | 9.7 | 9.4 | 8.9× |
| sys-points | 22.8 | 14.1 | 5.6 | 4.1× |
| sys-katsura3 | 310.9 | 172.5 | 67.9 | 4.6× |
| sys-circle | 112.9 | 74.2 | 27.9 | 4.0× |
| sys-linear-params | 43.8 | 25.3 | 13.5 | 3.2× |
| sys-kernel | 11.5 | 3.7 | 3.3 | 3.5× |

The slowest tests of the core suite before this gate, timed inside the suite (`--maxWorkers=2`, as before):

| Suite test | Before (s) | After (s) | Speed-up |
| --- | ---: | ---: | ---: |
| sin∘…∘sin(x) = 1/10 at depth 25 (periodic chain) | 117.6 | 0.67 | 176.6× |
| solves a depth-25 chain with the same code | 42.7 | 1.11 | 38.4× |
| ln(1 + ln(1 + … ln(1 + x))) = 0 at depth 25 (inversion chain) | 42.0 | 1.27 | 33.1× |
| x⁵ + a·x + 1 = 0: cells cut at the real zero of 256a⁵ + 3125, parametr | 7.0 | 0.34 | 20.4× |
| C3 sin(sin(sin(sin x))) = 1/10 | 6.6 | 0.12 | 53.9× |
| a·x² + b·x + c = 0 over ℝ splits a, b, c and the discriminant | 5.0 | 0.42 | 11.9× |
| sin∘…∘sin(x) = 1/10 at depth 3 (periodic chain) | 4.8 | 0.13 | 37.4× |
| sin∘…∘sin(x) + x = 0 at depth 25 (range engine) | 4.6 | 0.12 | 36.6× |
| atan x + atan 2x = π/4 is (−3 + √17)/4 (the other candidate is rejecte | 4.5 | 1.79 | 2.5× |
| rejects a moved breakpoint, a wrong root index, a missing case, a wron | 4.5 | 0.31 | 14.7× |
| degree 100 with 100 rational roots, and a degree-50 inequality | 4.5 | 1.35 | 3.3× |

**Targets:**

| Target | Result |
| --- | --- |
| No corpus case slower | met: none slower |
| Slowest cases at least 3× faster | met: the depth-25 sin chain 177×, the generators depth-25 chain 38×, the depth-25 ln chain 33×, the quintic 20×, C3 54×, the general quadratic 12×, the degree-100 verification 3.3× |
| Every baseline case under 1 s | met: the slowest is S4 at 0.47 s |

- **Core suite**: 38 files / 588 tests (1 skipped), 28 s wall, against 172 s before this gate.
- **Over 1 s (evidence cases only)**: atan-sum 1.8 s (2.9×), dominated by exact tower-norm interpolation, and the depth-25 ln chain 1.1 s (41×).

## Not in this gate

- Rust/WASM kernels (user decision).
- Throughput across stores (a shared global cache): rejected for determinism.
