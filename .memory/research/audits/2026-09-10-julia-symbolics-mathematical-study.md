# Julia symbolic ecosystem: mathematical implementation study

Date: 2026-09-10. Backend research gate, DIRECT root-only; no commit authorized.

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
- contributors: none

## Scope and evidence standard

The user approved ten static source mirrors, excluding Catalyst only, and requested deeper implementation study. Study means understanding algorithms and representations to inform independently developed Calcwiz mathematics. It does not authorize code copying, dependency adoption, framework adoption, application architecture changes, or unrelated subject expansion.

This is a bounded source study of each repository: manifests and root licenses, selected mathematical implementation paths, and selected test source. No Julia code, builds, package installation, upstream tests, or benchmarks were executed. Test descriptions below report assertions read, not passing test runs. Neither overall correctness nor superiority to Calcwiz or other CAS was established. All workspace applications below are research hypotheses, not claims of missing current capabilities or approved implementation milestones.

All source paths below are relative to `playground/sources/mirrors/<mirror-id>/`. Exact revisions, URLs, branches, licenses, and capture controls are in `playground/sources/metadata/*.yaml` and the companion session capture table. Nine captures use upstream default branches. Metatheory uses `ale/3.0` explicitly, not a claimed stable release. All ten are depth-1, clean, have no gitlinks, and remain ignored by Calcwiz Git. Ordinary files within upstream monorepo `lib/` directories are included; external dependency repositories were not fetched.

## 1. Symbolics.jl — mathematical transformations and repeated evaluation

Source anchors: `src/diff.jl:813`, `src/diff.jl:836`, `src/diff.jl:874`, `src/build_function.jl:148`, `src/build_function.jl:340`, `src/solver/main.jl:200`, `ext/SymbolicsNemoExt.jl`, `ext/SymbolicsGroebnerExt.jl`, `Project.toml`.

- Sparse differentiation first obtains a dependency-based Jacobian sparsity pattern, then differentiates only the indexed entries. This separates discovery of where work is needed from the actual derivative calculations. Structural presence can overestimate mathematical nonzeros; sparsity does not by itself prove rank or nonsingularity.
- Function generation supports separate allocating and in-place forms, optional common-subexpression elimination (CSE), and sparse-output handling. CSE is explicitly configurable and defaults false in the inspected methods. Zero-skipping must preserve output initialization: reused buffers cannot retain previous nonzero values where a new output is zero.
- Symbolic solving dispatches among univariate polynomial, isolation/attraction, and multivariate paths, with explicit unsupported returns. Nemo factorization and Groebner operations are delegated through extensions and conversion boundaries. This is substantial native symbolic implementation plus specialized backend cooperation, not an independent implementation of every advertised algorithm.
- `test/conditionals.jl:55` asserts a shared branching conditional executes once under CSE, while inactive branches remain unevaluated. Adjacent tests distinguish eager and branching conditionals and preserve that distinction through differentiation. This is directly relevant to piecewise numerical evaluation; it does not establish differentiability at branch boundaries.
- Study candidate: a bounded, domain-aware evaluation plan reused across Graphing samples, Tables rows, or numerical quadrature samples. Preserve branch laziness, domain errors, precision, and parameter identity. Measure preparation separately from repeated evaluation; do not infer Julia compilation gains transfer automatically to TypeScript/Rust.
- Prerequisites: explicit operator semantics, immutable expression identity or correct invalidation, branch-preserving transformations, numerical evaluation contracts, and a workload demonstrating enough reuse to amortize preparation.

## 2. SymbolicUtils.jl — representation semantics and allocation discipline

Source anchors: `src/types.jl:1`, `src/hashconsing.jl:7`, `src/hashconsing.jl:27`, `src/polyform.jl:69`, `src/polyform.jl:285`, `test/basics.jl:1078`.

- The representation distinguishes `SymReal`, `SafeReal`, and `TreeReal`. SafeReal avoids common-term numerator/denominator cancellation; TreeReal preserves tree form rather than applying the usual scalar algebra. Tests explicitly contrast retained variables in SafeReal divisions with cancellation under the default variant.
- Canonical Add/Mul-like forms and conversion to polynomial representations enable algebraic operations without treating every task as recursive generic tree rewriting. Polynomial fraction simplification converts numerator and denominator, finds a GCD, divides, and converts back.
- Equality has explicit comparison modes, including full metadata/type comparisons. The inspected DAG equality memo retains object references and checks identity even when identity hashes collide; it uses a small linear buffer before promoting to a dictionary and clears entries at the outer comparison boundary. These are concrete mechanisms worth understanding for proof and simplification workloads.
- Small argument storage and lazy atomically published argument caches address allocation and concurrent access. They entail lifecycle and semantic-identity obligations; a hash or pointer match is not a general mathematical-equivalence proof.
- Strength: cheap common operations tailored to a known algebra, with alternative representation semantics. Limit: SafeReal is not a complete assumptions/branch system, and an explicitly invoked transformation still needs its own applicability contract.
- Study candidate: profile coefficient combination, equality, and allocation before choosing compact node forms or interning. Preserve exclusions when simplifying `(x*x)/x`; compare original domain and simplified value separately. Prerequisites include exact scalar arithmetic, noncommutative/array distinctions where applicable, domain facts, and collision-safe cache identity.

## 3. TermInterface.jl — small mathematical traversal contract

Source anchors: `src/TermInterface.jl`, `src/expr.jl`, `test/runtests.jl`.

- The API distinguishes an expression (`head`/`children`) from a function call (`operation`/`arguments`). A Julia array reference is an expression but not a call under this implementation; tests assert that calling operation/arguments on it throws.
- It separates ordinary child access from deterministic sorted access, allowing a commutative dictionary-backed representation to avoid sorting in every traversal. Ordering obligations still belong to the representation: subtraction, division, function arguments, and matrix multiplication cannot be arbitrarily reordered.
- `maketerm` may return a more efficient representation rather than exactly its input type; reconstruction can therefore transform representation. Metadata defaults to nothing unless implemented.
- Strength: algorithms need not own every expression implementation. Limit: this small interface carries no universal algebra, assumptions, proof, units, or solver authority.
- Study candidate: compare a narrow traversal/reconstruction protocol against duplicated solver-local traversal, only if actual duplication warrants it. No universal AST or shared runtime refactor is proposed. Prerequisites are reconstruction laws and explicit metadata/ordering preservation tests.

## 4. Metatheory.jl — bounded equality saturation

Source anchors: `src/EGraphs/saturation.jl:27`, `src/EGraphs/saturation.jl:44`, `src/EGraphs/extract.jl:1`, `src/EGraphs/extract.jl:21`, `test/egraphs/extract.jl:13`.

- E-graphs retain equivalent alternatives; saturation searches rules, adds terms, merges equivalence classes, and rebuilds invariants. Operator/arity indexing accelerates ordinary pattern candidates. Variable-length segment patterns fall back to broader scans and allocate new variable-arity terms.
- Saturation parameters distinguish iteration count (`timeout`) from elapsed nanoseconds (`timelimit`), and bound eclasses/enodes. A backoff scheduler controls explosive rules. These mechanisms demonstrate that rewrite search needs a budget, not only a powerful matcher.
- Extraction iteratively computes costs from child costs. The supplied `astsize` counts tree nodes; that objective is not automatically execution time, numerical conditioning, or displayed readability. The inverse-size cost explicitly warns of trouble with cyclic egraphs.
- Concrete limitation: generic extraction currently calls `maketerm(..., nothing)` with a metadata TODO. It must not be assumed to preserve domain/proof metadata out of the box. Deterministic-extraction tests exist; one later example in the inspected test file is a bare comparison without `@test`, so not every displayed example is an enforced assertion.
- Study candidate: small, explicitly valid rewrite sets with measured node budgets and separate cost objectives. Never equate saturation under supplied rules with independently proving those rules. Prerequisites: side-condition proofs, domain-safe equivalences, metadata preservation, terminating extraction, and semantic backchecks. Development branch status is recorded in metadata.

## 5. Groebner.jl — the strongest direct elimination study in this batch

Source anchors: `src/f4/f4.jl:11`, `src/f4/f4.jl:49`, `src/f4/f4.jl:90`, `src/groebner/modular.jl:373`, `src/groebner/modular.jl:484`, `src/groebner/learn_apply.jl`, `src/utils/keywords.jl:19`, `src/groebner/parameters.jl:260`.

- F4 builds batches of polynomial reductions as sparse Macaulay matrices. Monomial tables identify matrix columns; symbolic preprocessing adds required reducers; linear algebra produces new basis elements. Specialized exponent storage, monomial ordering, divisibility filters, and field arithmetic support the main algorithm rather than generic expression trees.
- Rational computation uses denominator clearing, finite-field work, Chinese remainder reconstruction, and rational reconstruction. Coefficient-size heuristics, randomized modular checks, and rational checks are distinct stages. Defaults enable heuristic/randomized checking; `certify` defaults false.
- The inspected rational certification routine checks input normal forms and the Groebner property over the rationals. This is stronger checking than a sampled modular check, but it is not an exported producer-owned proof certificate for our result contract. Ideal equality and provenance still need explicit treatment in any independent implementation; a candidate basis cannot become authoritative from its name alone.
- Learn/apply records structural work and reuses it for related coefficient problems. Application returns a success flag and can fail; compact monomial overflow triggers a larger-exponent retry. `test/learn_and_apply.jl` compares reused computations with fresh computations across systems and fields.
- Strength: algorithm, arithmetic, storage, reconstruction, and reuse are developed together. Costs: matrix fill-in, coefficient growth, unlucky primes or changed support, and verification overhead. Source acknowledges msolve origins in selected GPL code; this is an algorithm study, not a code-transplant proposal.
- Study candidate: coefficient arithmetic plus polynomial elimination remains a sensible first mathematical target. Prerequisites: exact coefficient domains, polynomial ring/order identity, sparse operations, exact division, modular maps, reconstruction bounds, proof checking, and resource controls. Start with small independent finite-field cases before rational reconstruction and reuse.

## 6. SymbolicIntegration.jl — distinguish internal algorithms from public reachability

Source anchors: `src/methods.jl:154`, `src/methods/risch/frontend.jl:300`, `src/methods/risch/frontend.jl:663`, `src/methods/risch/rational_functions.jl:50`, `src/methods/risch/rational_functions.jl:260`, `src/methods/risch/algebraic_functions.jl:2`, `src/methods/risch/algebraic_functions.jl:138`, `src/methods/rule_based/frontend.jl:20`.

- Automatic dispatch tries rule-based integration, then Risch, then returns an unevaluated integral. The rule engine scans rules, stops at an applicable result, and tracks already-visited integrals along a rewrite chain to break multi-rule cycles. This suggests studying rule indexing and termination independently from increasing rule count.
- Rational integration contains Hermite reduction and logarithmic-term processing. Transcendental handling constructs towers of differential fields and derivations using AbstractAlgebra/Nemo. These algorithms depend on mature exact algebra rather than string matching alone.
- The captured repository includes algebraic lazy Hermite reduction and Trager integral-basis code, with explicit mathematical references and matrix/nullspace/Hermite-normal-form operations. However, the public Risch analyzer rejects non-integer powers and unsupported symbols/functions. The existence of internal algebraic code does not demonstrate general public radical integration.
- Typed implementation-limit and algorithm-failure signals can return unevaluated integrals; other exceptions are rethrown rather than mislabeled as unsupported mathematics. This distinction is valuable for identifying actual bugs versus mathematical boundaries.
- Evidence limitation: `test/methods/risch/test_algorithm_internals.jl:32` catches arbitrary exceptions in a rational-algorithm check and accepts them as exceptions; another block can skip on API failure. These particular tests are weak evidence of mathematical success. This is not a claim that the entire test suite has that weakness.
- Study candidate: Hermite decomposition with the exact invariant `f = D(g) + h`, differential-field construction, and rule termination. Prerequisites: exact polynomial/fraction fields, derivations, factorization/GCD, coefficient solving, branch facts, and antiderivative backchecks. Public capability must be tested separately from internal algorithm availability. No current Calcwiz frontier expansion is approved by this report.

## 7. ReversePropagation.jl — shared computation for gradients and contraction

Source anchors: `src/cse.jl:9`, `src/reverse_diff.jl:155`, `src/reverse_icp.jl:52`, `src/reverse_icp.jl:106`, `test/gradient.jl`, `test/icp.jl`.

- CSE creates ordered temporary assignments and reuses identical subexpressions. Reverse differentiation walks those assignments backwards and accumulates contributions, with numbered variables preventing accidental overwrite of previous accumulated contributions.
- Forward/backward interval code evaluates an expression, intersects its output with a requested constraint, then traverses reverse operators to narrow inputs. This is explicitly described as an HC4Revise contractor. IntervalArithmetic/IntervalContractors provide the numerical interval and reverse-primitive machinery; ChainRules supplies differentiation rules.
- Tests specify narrowing `x^2+y^2` from a large input box under a bounded output constraint and preserving parameter inputs. The returned forward range can be the original enclosure; it is not necessarily a freshly tightened final-range certificate.
- Strength: one expression computation structure supports different mathematical passes. Limits: primitive coverage, interval dependency overestimation, and source-tracing restrictions. The inspected CSE lowers n-ary calls by regrouping; an independent design must justify associativity and floating-point/branch behavior rather than applying this to arbitrary operations.
- Study candidate: interval exclusion and contraction for implicit 2D curves or 3D surfaces, plus gradients for normals or optimization. This is not a surface mesher, topology guarantee, existence proof, or complete root isolator. Prerequisites: outward-rounded intervals, domain-safe primitives, derivative rules, branch handling, subdivision/termination policy, and distinct exclusion versus existence evidence.

## 8. ModelingToolkit.jl — isolate the mathematical parts

Source anchors: `src/systems/alias_elimination.jl:88`, `src/systems/alias_elimination.jl:254`, `src/linearization.jl:375`, `src/linearization.jl:873`, `test/linearize.jl:21`, `Project.toml:23`.

- Signed-alias elimination recognizes relations of the form `x = y` and `x = -y`. It uses smaller-to-larger merging of groups with sign information. Opposing sign relations can force an entire component to zero in the intended scalar setting. The mathematical lesson is reducing a special, cheap class of constraints before expensive general elimination.
- Such a reduction needs its domain conditions: division/cancellation of a symbolic coefficient requires nonzero evidence, and sign arguments differ in characteristic two. Upstream system assumptions cannot be silently inherited by a generic exact-domain implementation.
- Symbolic linearization forms Jacobian blocks for differential/algebraic variables and uses linear solves involving the algebraic block. It explicitly rejects a failed factorization and optionally rejects input derivatives. The numerical path prepares derivative computations through DifferentiationInterface; not all differentiation machinery is implemented locally.
- Strength: concrete preprocessing mathematics exists inside a large framework. Limit: the source functions are tightly coupled to system state, observed variables, incidence graphs, and external transformations. A source function is not an independently reusable algorithm specification.
- Study candidate: signed equivalence reduction and local Jacobian/block-elimination mathematics only. Model composition, initialization workflows, simulation orchestration, and control-system product features remain outside scope. Graphing does not require this framework.
- Root license is MIT. ModelingToolkitBase is ordinary included monorepo source; ModelingToolkitTearing and StateSelection are separately declared external dependencies, not captured here. Root licensing does not describe that whole dependency stack. No external dependency implementation was studied as if locally present.

## 9. DataDrivenDiffEq.jl — explicit numerical mathematics inside the monorepo

Source anchors: `lib/DataDrivenSparse/src/algorithms/STLSQ.jl:89`, `lib/DataDrivenSparse/src/algorithms/SR3.jl:112`, `lib/DataDrivenDMD/src/algorithms.jl:1`, `lib/DataDrivenDMD/src/algorithms.jl:146`, `src/utils/collocation.jl`.

- DataDrivenSparse contains actual sequential thresholded least-squares (STLSQ), SR3, and ADMM algorithm files. STLSQ fits coefficients, selects an active subset by threshold, and refits. It optionally constructs a ridge normal-equation system; this is not only package orchestration.
- SR3 prepares a regularized Cholesky factorization and reuses it while alternating coefficient and proximal updates. The useful idea is amortizing fixed linear algebra across iterations, with explicit factorization and conditioning requirements.
- DataDrivenDMD implements truncated SVD with either rank or relative singular-value selection, forms a reduced operator, and computes eigenmodes. The source uses inverse retained singular values; the displayed docstring shorthand should not replace reading the implementation. Numerical rank thresholds are algorithm parameters, not exact-rank proofs.
- Collocation/interpolation code addresses obtaining smooth values or derivative estimates from sampled data. Errors in derivative estimation can dominate later equation fitting. Basis choice, scaling, noise, conditioning, and validation data affect any discovered formula.
- `lib/DataDrivenSparse/test/Core/sparse_linear_solve.jl` tests noisy synthetic data using residual/statistical thresholds and active-set behavior. These are fitting criteria, not symbolic identity proofs.
- Study candidate: sparse fitting, regularization, factorization reuse, and rank-reduced numerical linear algebra for a separately requested Statistics capability. Differential-equation product workflows and unrelated domain examples are outside scope. Prerequisites: stable linear solves, rank/conditioning policy, scaling, stopping rules, residual reporting, and held-out validation. None is an approved new feature here.

## 10. SymbolicRegression.jl — formula discovery with bounded search objectives

Source anchors: `src/RegularizedEvolution.jl:102`, `src/HallOfFame.jl:15`, `src/HallOfFame.jl:163`, `src/LossFunctions.jl:116`, `src/ConstantOptimization.jl:202`, `src/Complexity.jl`, `test/unit/operators-core/test_complexity.jl`.

- Evolution samples candidates, mutates or crosses expressions, and replaces older population members. The hall of fame retains best candidates by complexity; Pareto extraction keeps candidates that improve on all simpler alternatives.
- Constant optimization is a separate numerical step using Optim with optional derivative support and random restarts. It accepts an improvement over baseline or restores original constants. Structural search and numerical parameter refinement solve different subproblems.
- Expression evaluation is delegated through DynamicExpressions interfaces. Failed/incomplete evaluation returns infinite loss in the inspected loss path. Complexity can assign different costs to operators, variables, and constants; source tests assert those customized scores.
- Strength: separates candidate representation, expression evaluation, parameter fitting, and model selection. Limits: stochastic search, dependence on the allowed grammar and data, overfitting/extrapolation risk, and no guarantee of globally best or symbolically correct formulas.
- Study candidate: optional formula discovery from data, with explicit model provenance and residuals. It is not an exact simplifier, integrator, or proof-producing equation solver. Prerequisites: deterministic experiment controls, operator domains, stable fitting, training/validation separation, evaluation budgets, and error/complexity reporting.
- Root license is Apache-2.0, not MIT. DynamicExpressions and Optim are external dependencies and were not automatically mirrored or executed.

## Cross-repository conclusions and bounded experiments

These are proposed research experiments, not implementation decisions or performance claims:

| Mathematical target | Most useful sources from this batch | First discriminating experiment | Required correctness distinction |
| --- | --- | --- | --- |
| Coefficients and elimination | Groebner; SymbolicUtils polynomial conversion | Small finite-field systems, then rational reconstruction and changed-support cases | Sampled checks versus exact verification and producer proof |
| Repeated scalar/vector evaluation | Symbolics; SymbolicUtils; ReversePropagation | Repeated subexpressions, changing parameters, inactive invalid branches, reused zero outputs | Algebraic equality versus floating-point and branch behavior |
| Integration | SymbolicIntegration | Verify Hermite residual identity and public route reachability separately | Internal algorithm presence versus complete antiderivative with domain facts |
| Implicit graphing mathematics | ReversePropagation; Symbolics | Boxes wholly excluded, boxes needing subdivision, singular points, piecewise expressions | Exclusion/contraction versus existence and geometric topology |
| Cheap system reduction | ModelingToolkit signed aliases | Long alias chains, opposing signs, protected unknowns, zero/unknown coefficients | Domain-valid elimination versus heuristic substitution |
| Equivalent expression search | Metatheory | Small valid theory under node/time caps, preserving metadata | Cheapest discovered form versus global optimum or proof of rules |
| Numerical fitting | DataDrivenSparse/DMD; SymbolicRegression | Noisy and ill-conditioned data with held-out samples | Fitted model versus mathematical identity |

The productive mix is not a universal representation or wholesale framework. Different mathematical tasks benefit from different forms: exact polynomials, shared expression DAGs, unevaluated array operations, bounded egraphs, interval evaluation graphs, and numerical fitting trees. Conversion costs, semantic loss, proof conditions, and end-to-end workload measurements decide whether any such idea is useful for Calcwiz.

Before an implementation proposal, inspect the corresponding current Calcwiz source and declare existing versus missing prerequisites. This capture does not replace that impact analysis. Source inspection alone cannot rank speed, establish capability parity, or show that all ten projects form a compatible installable environment.
