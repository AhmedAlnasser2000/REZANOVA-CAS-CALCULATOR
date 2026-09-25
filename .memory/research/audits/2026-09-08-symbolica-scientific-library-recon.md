# Symbolica and scientific library reconnaissance

Date: 2026-09-08

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Scope and evidence limits

- User authorized Symbolica registration, clone, and deep static study. The later clarification explicitly makes NumPy/SciPy recommendations app-wide, not limited to coefficient arithmetic and polynomial elimination.
- Root-only DIRECT; backend research/registry gate. No production source edits, numerical executions, visual acceptance, comparative benchmarks, dependency installs, license activation, code reuse, commits, or pushes.
- Captured https://github.com/symbolica-dev/symbolica at `77c137481904b8a5531ede86e3ef36b82beed7fd` (commit date 2026-07-22; package 2.2.0), on 2026-09-08, under ignored `playground/sources/mirrors/symbolica/`.
- Registry was added before shallow, single-branch, no-tags, no-submodule capture. All subsequent mirror work was static reads/search/Git metadata inspection. No gitlinks were present in the captured tree.
- Symbolica root License.md has custom source-available restrictions on copying/distribution; it is not a permissive open-source license. Its source-availability page explicitly describes educational study. No adoption permission is inferred: https://symbolica.io/license/.
- Included `lib/numerica/` has its own MIT License.md. This license distinction does not waive Calcwiz's no-reuse/no-execution mirror rules. No separate Numerica clone was made.
- This is a focused deep source study of representation, domains, polynomial algorithms, evaluation, streaming, and integration boundaries, not an exhaustive audit of all source or correctness.

## Source-backed Symbolica findings

Paths below are relative to the captured Symbolica root.

| Area | Source evidence | Calcwiz implication |
| --- | --- | --- |
| Algebraic contracts | `src/domains.rs`; `lib/numerica/src/domains.rs`: Ring, EuclideanDomain, Field, associated element types, ring-owned arithmetic, characteristic and fallible division/inversion | A modern Rust counterpart to the useful part of FriCAS categories/domains; use narrow contracts around actual consumers. |
| Integer arithmetic | `lib/numerica/src/domains/integer.rs`: Single(i64), Double(i128), Large; `domains/rational.rs`: fraction normalization and reconstruction | Study checked small arithmetic plus explicit promotion before extending exact capacity. Machine integers and multiprecision have different costs. |
| Expression layout | `src/atom/representation.rs`: byte-backed atoms and borrowed byte views, type/normalization flags; `src/state.rs`: bounded recyclable atom buffers and global symbol state | Compact storage and scratch reuse can reduce allocation; global symbol state would need explicit lifetime/serialization ownership in Calcwiz. Do not assume a packed tree gives DAG interning automatically. |
| Polynomial storage | `src/poly/polynomial.rs`: generic ring, coefficient/exponent vectors, shared variable map and monomial order | Separate mathematical domain, variable ordering, and physical storage. Avoid formatting inside arithmetic loops. |
| Resultants | `src/poly/resultant.rs`: Brown polynomial remainder sequence and primitive PRS; EuclideanDomain/Field constraints | Direct research reference for replacing Calcwiz's capped cofactor-expansion symbolic resultant once exact division and normalization are dependable. Study the published algorithm independently; no source port. |
| GCD/factorization | `src/poly/gcd.rs`, `src/poly/factor.rs`: modular images, interpolation/reconstruction, heuristics, Zippel and Hu-Monagan paths | Method selection and reconstruction can control coefficient growth; require bad-prime handling and exact verification before adoption. |
| Polynomial ideals | `src/poly/groebner.rs`: F4, critical pairs, matrix reductions, basis checking over supported field implementations | Much broader algebraic machinery than Calcwiz's bounded bivariate projection; a later capability program, not the first coefficient gate. |
| General-expression zero | `src/domains/atom.rs`: AtomField defaults statistical_zero_test to true; is_zero calls zero_test(10, f64::EPSILON) and accepts a not-false result | This specific default is not producer-owned exact proof. It cannot replace Calcwiz's zero/nonzero/unknown and branch/parameter obligations. Do not generalize this observation to exact finite-field or rational algorithms. |
| Evaluation | `src/evaluate/tree.rs`, `optimize.rs`, `backend.rs`, `export.rs`: Horner planning, common-subexpression machinery, stack optimization, JIT via SymJIT, SIMD and generated native/CUDA paths | Study compile-once/evaluate-many for Graphing/Table/numerical calculus. Measure preparation cost, batch size, numerical stability, and transfer overhead separately. No native execution/backend adoption is authorized. |
| Differentiation and numerical domains | `src/derivative.rs`, `lib/numerica/src/domains/dual.rs`, `lib/numerica/Readme.md`: symbolic derivatives, higher-order dual arithmetic, error-propagating floats | Distinguish symbolic differentiation, automatic differentiation, and finite differences. Error tracking alone is not a rigorous interval certificate. |
| Integration | Numerica provides Vegas-style Monte Carlo integration; `src/api/python/symbolic_integration.rs` registers optional implementation callbacks; `expression.rs` checks their presence | Numerical integration is not indefinite symbolic integration. This clone does not establish complete symbolic integration parity; the separate integration implementation was not captured or audited. |
| Large expressions | `src/streaming.rs`: buffered term streams, disk spill, compression and parallel sorting infrastructure | A useful future reference if supported workloads outgrow RAM; no current justification for adding disk-backed solver execution to Calcwiz. |

## Comparison with inspected Calcwiz source

- Exact arithmetic: `src/lib/algebra/polynomial-core/types.ts` and `scalars.ts` use number-based rational components; `src/lib/linear-algebra/exact-matrix-core.ts` supplies checked arithmetic/growth stops. Symbolica/Numerica have reusable multiprecision promotion and domain arithmetic. This study does not demonstrate an app-visible arithmetic failure.
- Polynomial elimination: `src/lib/symbolic-engine/primitives/symbolic-polynomial/resultant.ts` recursively expands determinant minors; `types.ts` caps Sylvester dimension and work. `src/lib/algebra/polynomial-elimination/` provides bounded bivariate projection. These are narrower than Symbolica's generic PRS/F4/modular infrastructure.
- Matrix/Vector: `src/lib/linear-algebra/dimension-contract.ts` caps ordinary editing at 8x8 and exact elimination at 6x6; symbolic elimination separately caps 3x3 in `symbolic-elimination.ts`. `matrix-svd.ts` already uses ml-matrix. General large sparse/tensor numerical computing is not the same product contract.
- Graphing: `src/lib/graphing/evaluator/{compile,cache,evaluate}.ts` already separates bounded instruction planning, revision-aware caching, and evaluation. Symbolica supplies additional optimizer/backend machinery; it is not a graph-scene/UI replacement.
- Numerical calculus: `src/lib/calculus/engine/integration.ts` uses adaptive Simpson for numerical definite integration. `workspace/ode.ts` handles scalar IVP ingress/web RK4 fallback. `src-tauri/src/lib.rs` owns RK4 and an adaptive branch named rk45 using RK4 step doubling. That implementation is not SciPy's embedded Dormand-Prince RK45 method. Naming/method review is a separate future issue, not repaired here.
- Statistics: `src/lib/statistics/distributions.ts` currently routes binomial, normal, and Poisson through stdlib packages. SciPy's distribution/testing/fitting surface is substantially broader. This does not imply the rest of Calcwiz Statistics is limited to distributions.
- App scope: Calcwiz owns guided workspaces, history/replay, domain facts, canonical results, stale/cancel legality, and interactive graph scenes. A math library's algorithm inventory does not supply these contracts.

## App-wide research priorities

These are recommendations only. Only Symbolica was captured.

| Candidate | Why study it across Calcwiz | Suggested scope |
| --- | --- | --- |
| NumPy | Dtypes, contiguous/strided buffers, views vs copies, broadcasting, vectorized loops, batched numerical computation | Graph/Table sampling, numerical Matrix/Vector, statistical data. It is an array foundation, not a broad exact CAS. |
| SciPy | Solver selection, termination/error diagnostics, quadrature, system/stiff ODEs/events, interpolation, optimization, sparse algebra, statistics and special functions | Highest broad scientific-method reference; use scoped reading lanes instead of trying to reproduce the entire library. |
| FLINT (including Arb functionality) | Integer/rational/finite-field arithmetic, exact matrices, polynomial GCD/factorization, modular reconstruction, rigorous ball arithmetic | Highest additional reference priority for algebra plus future rigorous numerical work. |
| Numerica | Modern Rust domain traits, integer promotion, reconstruction, dual numbers, matrices, Monte Carlo integration | Already available inside the pinned Symbolica tree; standalone capture unnecessary for initial reading. |
| Singular | Polynomial ideals, monomial order, elimination and Groebner bases | Later polynomial-system expansion; defer clone until that lane is approved. |
| BLAS/LAPACK implementations | Numerical factorizations, stability, hardware-aware bulk kernels | Follow NumPy/SciPy references when matrix scale creates demand; these explain much native numerical performance. |

Primary references checked on 2026-09-08:

- https://numpy.org/doc/stable/reference/ufuncs.html
- https://numpy.org/doc/stable/user/basics.broadcasting
- https://numpy.org/doc/stable/reference/routines.linalg.html
- https://docs.scipy.org/doc/scipy/tutorial/index.html
- https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html
- https://docs.scipy.org/doc/scipy/reference/stats.html
- https://flintlib.org/ and https://flintlib.org/doc/introduction.html
- https://github.com/symbolica-dev/numerica
- https://www.singular.uni-kl.de/index.php/singular.pdf

## Recommended research sequence and limits

- Maintain two reading tracks: shared algebra (coefficient contracts, PRS, normalization, reconstruction) and app-wide numerical methods (arrays, ODEs, statistics, sampling, optimization).
- First implementation candidate remains coefficient arithmetic plus polynomial elimination. No implementation design or milestone is approved by this reconnaissance.
- Require matching semantics, precision, proof strength, hardware/threads, input distributions, cold/warm preparation, execution and readback timing before claiming speed superiority. Source shape supports hypotheses, not timings.
- A useful experiment compares current arithmetic and a bounded native-domain prototype on small common cases, coefficient-growth cases, singular parameters, and over-budget inputs; preserve exact backchecks and explicit uncertainty.
- No universal solver AST, workspace merger, generic worker, Python bridge, native dependency, GPU runtime, or global symbol registry is selected.
