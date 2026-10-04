# EQUATION-PROOF-PERFORMANCE1: Measured Hot Paths and Fast Verification (gate 12)

Date: 2026-10-04
Status:
- **Part A (benchmark corpus, cheap cost accounting, fixed-point enclosures, per-store caches)**: implemented and backend-verified on 2026-10-04; private, no production caller.
- **Part B (certificates-first verification, slice hot paths)**: in progress, in the same PR.

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

## Not in this gate

- Rust/WASM kernels (user decision).
- Throughput across stores (a shared global cache): rejected for determinism.
