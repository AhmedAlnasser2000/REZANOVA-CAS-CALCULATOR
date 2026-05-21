# FriCAS Capability Atlas

milestone: FRICAS-CTX0  
date: 2026-05-01  
source_mirror: `playground/sources/mirrors/fricas/`  
captured_commit: `b10e5fd9cae9fb0e76994452b00ad794a459dfa6`

## Architecture And Runtime

Evidence: `doc/runtime.txt`, `doc/algebra_build.txt`, `src/interp/daase.lisp`, `src/interp/database.boot`.

- Capability: runtime representation of Spad types, domains, categories, packages, operation databases, and lazy constructor metadata.
- Enablers: domain vectors, category/domain constructor caches, operation/category databases, autoloading, bootstrap stages.
- User value: broad algebra library can be organized and resolved across many mathematical structures.
- Cost: high implementation and build complexity; cyclic dependency and bootstrap management become permanent architecture concerns.
- Calcwiz translation: a small capability registry for owned cores only, with explicit readiness facts and stop reasons.
- Do not inherit: executable type constructors, global operation databases, or bootstrap complexity.

## Type Resolution And Coercion

Evidence: `src/interp/i-resolv.boot`, `src/interp/i-coerce.boot`, `src/interp/modemap.boot`.

- Capability: resolve compatible algebraic types and coerce/retract values between representations.
- Enablers: mode maps, type towers, category predicates, coercion tables, retraction logic.
- User value: mixed symbolic expressions can route to capable domains.
- Cost: hidden coercions can be hard to explain; the system assumes a large typed universe.
- Calcwiz translation: explicit adapters between AST, polynomial, rational, interval/domain, matrix, and calculus carriers.
- Do not inherit: implicit global coercion as a default behavior.

## Expression Model And Simplification

Evidence: `src/algebra/expr.spad`, `src/algebra/elemntry.spad`, `src/interp/rulesets.boot`, `src/input/bugs2024.input`.

- Capability: expressions over kernels and function spaces, with elementary, algebraic, Liouvillian, combinatorial, and special-function layers.
- Enablers: kernel towers, function-space categories, algebraic reduction, attachable predicates/assertions.
- User value: broad expression families can participate in calculus and algebra operations.
- Cost: simplification policy becomes branch/domain-sensitive and hard to make transparent.
- Calcwiz translation: bounded known-function registry plus explicit simplification policies and detail notes.
- Do not inherit: broad global rewrite systems without assumption and domain surfacing.

## Symbolic Integration

Evidence: `src/algebra/integrat.spad`, `src/algebra/intef.spad`, `src/algebra/intalg.spad`, `src/algebra/liouv.spad`, `src/algebra/defintef.spad`, `src/input/integ.input`.

- Capability: elementary, algebraic, parametric, special, and definite integration paths with normalization and integration result objects.
- Enablers: Risch-style normalization, function-space towers, algebraic integration packages, result containers, derivative relationships.
- User value: far broader antiderivative and definite-integral behavior than small rule stacks.
- Cost: requires strong algebra, assumptions, branch/domain handling, and complex result representation.
- Calcwiz translation: strategy-aware bounded integration expansions with derivative backchecks and domain-range gates.
- Do not inherit: a broad Risch engine until prerequisites are explicit and incubated.

## Limits And Asymptotics

Evidence: `src/algebra/limitps.spad`, `src/algebra/mrv_limit.spad`, `src/input/limit.input`.

- Capability: finite/infinite, left/right, power-series, Puiseux/exponential expansion, MRV/Gruntz-style limit handling, special-function asymptotics.
- Enablers: series domains, ordered expressions, MRV set/rewrite, sign tools, special-function knowledge.
- User value: handles many cases beyond local rational and elementary equivalents.
- Cost: broad asymptotic machinery can become a hidden engine with complex failure modes.
- Calcwiz translation: future bounded asymptotic readiness lane after current local-limit core, with explicit method details.
- Do not inherit: general asymptotic engine as a silent fallback.

## Polynomial Algebra

Evidence: `src/algebra/polycat.spad`, `src/algebra/poly.spad`, `src/algebra/modgcd.spad`, `src/algebra/allfact.spad`, `src/algebra/catdef.spad`.

- Capability: univariate/multivariate polynomial categories, gcd, factorization, coefficient-domain-sensitive algorithms.
- Enablers: polynomial category hierarchy, ordered exponent monoids, coefficient-domain contracts.
- User value: solving, simplification, integration, and limits can use exact algebraic substrates.
- Cost: broad algebra hierarchy is heavy and can overtake product architecture.
- Calcwiz translation: typed polynomial-core capabilities for factor/gcd/cancel/square-free readiness.
- Do not inherit: category hierarchy before real feature pressure demands it.

## Grobner, Elimination, And Regular Chains

Evidence: `src/algebra/gb.spad`, `src/algebra/groebf.spad`, `src/algebra/regset.spad`, `src/algebra/nsregset.spad`, `src/input/test.input`, `src/input/noonburg.input`.

- Capability: Grobner bases, normal forms, factorized Grobner, ideal/variety decomposition, triangular sets.
- Enablers: exact polynomial rings, term orderings, factorization, nonzero restrictions, regular triangular set structures.
- User value: stronger exact system solving and elimination.
- Cost: high mathematical and UX complexity; solution sets require branch/decomposition honesty.
- Calcwiz translation: Playground-only bounded elimination prototype over tiny polynomial systems.
- Do not inherit: using Grobner as a general solver black box.

## Exact Linear Algebra

Evidence: `src/algebra/matrix.spad`, `src/algebra/matcat.spad`, `src/input/linalg.input`.

- Capability: matrices parameterized by coefficient domains, with operations gated by algebraic capabilities.
- Enablers: matrix categories and packages; determinant/rank/nullspace/inverse depend on ring/field/Euclidean-domain facts.
- User value: exact system solving, vectors, matrices, and future algebraic workflows.
- Cost: representation and coefficient-domain handling must be correct before UX promises expand.
- Calcwiz translation: exact-linear-algebra core with capability gates and result envelopes.
- Do not inherit: broad matrix category system.

## Series And Special Functions

Evidence: `src/algebra/gseries.spad`, `src/algebra/genser.spad`, `src/algebra/expexpan.spad`, `src/input/limit.input`.

- Capability: generalized series, special-function expansions, asymptotic support.
- Enablers: series domains and special-function knowledge.
- User value: stronger limits, approximations, and calculus.
- Cost: large capability surface and branch/validity concerns.
- Calcwiz translation: bounded `CALC-SER1` style series and display-first special-function policy.
- Do not inherit: broad special-function library as a hidden dependency.
