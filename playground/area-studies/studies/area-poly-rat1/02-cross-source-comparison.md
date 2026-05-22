# AREA-POLY-RAT1 Cross-Source Comparison

## Compared Sources

| Source | POLY/RAT domain shape | Calcwiz lesson |
| --- | --- | --- |
| Calcwiz | Bounded one-variable exact rational substrate with explicit stops. | Keep small core ownership and widen by slices. |
| FriCAS | Typed algebraic domains/categories over rings, fields, fractions, square-free, partial fractions, and Grobner. | Translate domain discipline, not architecture. |
| SymPy | Practical domain construction plus polynomial, rational, square-free, partial-fraction, and Grobner modules. | Add staged conversion/factorization facts before algorithms. |
| Maxima | Classic rational representation, factor/EZ-GCD/resultant, to-poly solving, and rational integration reductions. | Mine examples and historical families; avoid implicit broad transforms. |
| SageMath | Platform-scale polynomial rings, fraction/function/number/finite fields, Singular-backed ideals/Groebner. | Long-term orchestration evidence, not near-term backend strategy. |
| Giac/XCAS | Calculator-engine polynomial/rational machinery and integration/elimination tests. | Deep capability can stay product-hidden but must not create parity pressure. |
| SymEngine | Lean polynomial/rational core and cancellation/performance tests. | Future core boundaries should stay compact and typed. |
| GeoGebra | CAS workflow, Giac integration, symbolic command tests, geometry/CAS interaction. | Product surfaces need workflow honesty and tests around user commands. |

## Shared Patterns

- Expressions are not trusted as polynomials until a conversion/domain gate succeeds.
- Coefficient domains are algorithm inputs, not formatting details.
- Rational functions need normalized numerator/denominator structure plus preserved denominator facts.
- Factorization is layered: rational roots/distinct linear factors are not the same as square-free, algebraic, modular, or multivariate factorization.
- Partial fractions are a substrate used by integration, not an integration proof by themselves.
- Resultants and Grobner/elimination belong to a higher capability tier with variable ordering and coefficient-domain policy.
- Simplification and normal forms are cross-cutting risk areas for rational equality, cancellation, and readable output.

## Divergences

- FriCAS and SageMath optimize for mathematical generality; Calcwiz optimizes for bounded workbench trust.
- SymPy exposes broad practical APIs; Calcwiz should expose narrower, more explicit result surfaces.
- Maxima and Giac/XCAS show broad transform systems; Calcwiz should not adopt broad hidden rewrites.
- SymEngine is core-first and lean, but does not by itself solve user-facing honesty, domain stops, or guided workflow.
- GeoGebra emphasizes product command flow and visual math workflows rather than owning the CAS polynomial engine directly.

## Calcwiz Relevance

The mirrors agree that Calcwiz should continue core strengthening before widening calculus:

- `POLY-RAT-CORE1` should own repeated linear factors, irreducible quadratic readiness, square-free/factor readiness, and stronger stops.
- `INT-RAT2` should consume those facts later rather than implement them locally.
- `AREA-SIMPLIFY0` should be planned when normal-form/readback blocks trustworthy output.
- `AREA-POLY-ELIM0` should be separate because resultants/Grobner change the problem class.

## Non-Adoption Notes

Calcwiz should not inherit:

- FriCAS's full domain/category system.
- SageMath's multi-backend platform model.
- SymPy's broad public API promises.
- Maxima's implicit transform style.
- Giac/XCAS's calculator-CAS feature parity pressure.
- SymEngine's fast-core rewrite pressure before scope is proven.
- GeoGebra's UI/assets/service assumptions.
