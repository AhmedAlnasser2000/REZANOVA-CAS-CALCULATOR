# AREA-ASSUMPTIONS0 Source Notes

## Source

Calcwiz.

## Relevant Capability

Calcwiz already has several local fact systems:

- `src/lib/algebra/domain-range-core.ts` for bounded real-domain constraints, range proofs, one-sided checks, and interval checks.
- `src/lib/algebra/branch-core.ts` for bounded branch/case bookkeeping.
- `src/lib/algebra/simplify-policy.ts` for form intent, equivalence trust, and preserved facts.
- `src/lib/equation/domain-guards.ts`, `src/lib/equation/candidate-validation.ts`, and equation tests for residual validation, exclusions, and candidate rejection.
- `src/lib/calculus/calculus-core.ts` for definite-integral real-domain interval safety and one-sided limit domain stops.
- `src/lib/algebra/rational-function-core.ts` for denominator constraints and rational-family stops.

## Enabling Pattern

The strength is that Calcwiz already treats many domain facts as local typed facts rather than prose-only warnings. The weakness is that those facts do not yet share one durable ledger shape across surfaces.

## Cost

Keeping facts local has low short-term cost but creates drift: simplify, solve, integral, limit, table, and future graphing surfaces can each say similar things differently or lose a fact during handoff.

## Calcwiz Translation Hint

Translate the existing local facts into one small `ASSUMPTIONS-CORE0` fact model. It should not be a global theorem prover. It should be a scoped ledger with fact kind, variable/scope, source operation, trust level, display text, and stop reason.

## Source

FriCAS.

## Relevant Capability

FriCAS attaches much of its mathematical power to typed domains, categories, predicates, and coercion/runtime lookup. Static evidence includes `src/interp/nrunfast.boot` for domain/category lookup and predicate vectors, plus `src/algebra/` domains/packages where operations are selected by mathematical structure.

## Enabling Pattern

Assumptions are often implicit in the domain in which an operation lives: algebraic domains, ordered/ring structures, integration packages, and expression domains constrain what operations mean.

## Cost

The machinery is powerful but heavy. FriCAS's domain/category runtime is a parent architecture, not a bounded Calcwiz slice.

## Calcwiz Translation Hint

Borrow the idea that every result should know its mathematical context. Do not inherit the full category/domain tower. A small result-attached fact ledger is the Calcwiz-native translation.

## Source

SymPy.

## Relevant Capability

SymPy exposes explicit assumptions (`sympy.assumptions`, `Q.*`, `ask`, `refine`), set/domain-aware solving (`solveset(..., domain=S.Reals)`), and calculus domain helpers such as `continuous_domain` in `sympy/calculus/util.py`.

## Enabling Pattern

SymPy separates expression structure, assumptions, sets/domains, and solver domains. Its tests include many domain examples for logs, roots, inverse trig, rational denominators, inequalities, and real/complex solve variants.

## Cost

The API surface is broad and easy to over-promise. Calcwiz should not expose a general assumptions language before it can honestly support it.

## Calcwiz Translation Hint

Use SymPy as evidence that domains and assumptions must be explicit. Translate this into scoped internal facts and domain-specific stops, not a public assumption API.

## Source

Maxima.

## Relevant Capability

Maxima uses global and interactive assumption mechanisms (`assume`, `declare`, `asksign`, `ask-declare`) plus simplification packages that inspect sign/domain facts. Static evidence includes `src/askp.lisp`, `share/simplification/ineq.mac`, and `share/raddenest/raddenest.mac`.

## Enabling Pattern

Simplification and solving can improve when sign and domain facts are available, especially for radicals, powers, inequalities, and absolute values.

## Cost

Global mutable assumptions are risky for a guided calculator because results may depend on invisible session state.

## Calcwiz Translation Hint

Borrow the sign/domain value, not the global state model. Calcwiz should prefer request-local or result-local facts that are visible, replayable, and history-safe.

## Source

SageMath.

## Relevant Capability

SageMath often orchestrates several systems and carries domain/parent information through its object model. Static evidence includes symbolic calculus/tests and manifold/domain code such as `src/sage/manifolds/scalarfield.py`, where operations are domain-aware.

## Enabling Pattern

Objects know their parent/domain, and operations can restrict or compare domains before proceeding.

## Cost

SageMath's platform breadth is intentionally much larger than Calcwiz. A multi-backend assumption story would be premature.

## Calcwiz Translation Hint

Borrow the orchestration lesson: consumers should ask the fact layer whether a transform is valid, not infer validity from display strings.

## Source

Giac/XCAS.

## Relevant Capability

Giac/XCAS exposes calculator-style assumption and branch behavior around solving, singularity detection, `when`/piecewise conversion, and range assumptions. Static evidence includes `src/giac/cpp/solve.cc`, `src/giac/cpp/prog.cc`, and `src/giac/cpp/alg_ext.cc`.

## Enabling Pattern

Calculator-style CAS features need practical assumptions and singularity handling near user-visible solve/integral/plot workflows.

## Cost

The breadth is too large to copy, and warning-driven branch choices can become opaque if Calcwiz does not surface them clearly.

## Calcwiz Translation Hint

Borrow the practical stress cases: singularities, finite intervals, branch choices, and assumptions tied to solve/graph contexts should become benchmark families for a bounded fact core.

## Source

SymEngine.

## Relevant Capability

SymEngine is a lightweight symbolic core with sets, integer/rational primitives, symbol traversal, and optional assumption-aware interfaces such as `symengine/assumptions.h`, `simplify.h`, and matrix expression predicates.

## Enabling Pattern

A fast core can stay useful by keeping assumptions small and close to predicates rather than becoming a broad user-facing logic system.

## Cost

Its minimalism does not answer whole-product readback, branch, or guided UX questions.

## Calcwiz Translation Hint

Borrow the small-core discipline: `ASSUMPTIONS-CORE0` should start as typed facts and predicates, not a giant reasoning layer.

## Source

GeoGebra.

## Relevant Capability

GeoGebra is useful here as CAS/workflow evidence rather than a pure algebra engine. Static evidence includes CAS cell flows under `source/desktop/desktop/src/test/java/org/geogebra/cas/`, CAS API tests, and integration through Giac.

## Enabling Pattern

Graphing, CAS cells, geometry, and algebra workflows need visible validity/undefined behavior, not just hidden algebra.

## Cost

GeoGebra's product identity and graphing-first workflows should not be inherited by Calcwiz.

## Calcwiz Translation Hint

Use GeoGebra to stress future graph/table readiness: undefined rows, holes, discontinuities, branch-sensitive curves, and CAS result trust should be representable before they become graph behavior.
