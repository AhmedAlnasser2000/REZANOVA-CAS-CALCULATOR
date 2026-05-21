# AREA-POLY-RAT0 Cross-Source Comparison

## Compared Sources

| Source | Main evidence value | Fit for Calcwiz now |
| --- | --- | --- |
| Calcwiz | Bounded exact substrate and product honesty constraints. | Immediate owner of `INT-RAT1`. |
| FriCAS | Deep typed algebraic structures and broad exact CAS power. | Architecture discipline only. |
| SymPy | Practical domain conversion, polynomial tools, rational tools, partial fractions. | Strong near-term pattern source. |
| Maxima | Classic factor/solve/rational transform behavior. | Useful test-family source. |
| SageMath | Multi-engine platform routing and exact algebra ecosystem. | Long-term orchestration context. |
| Giac/XCAS | Calculator-style high-power CAS engine. | Strong calculator realism source. |
| SymEngine | Lean symbolic-core representation and cancellation. | Strong small-core pattern source. |
| GeoGebra | CAS/prover/user-workflow integration. | UX and workflow context. |

## Shared Patterns

- Convert expressions into explicit polynomial/rational domains before algebraic algorithms run.
- Keep coefficient domains visible to the algorithm layer.
- Normalize rational functions by cancellation before higher-level use.
- Separate partial-fraction readiness from integration adoption.
- Treat Grobner/elimination/resultants as a different tier of algebraic power, not a prerequisite for every rational function.
- Preserve user-facing constraints such as denominator nonzero facts.

## Divergences

- FriCAS and SageMath favor broad algebraic domain systems; Calcwiz should not inherit that weight now.
- SymPy and Maxima expose much broader symbolic transformations; Calcwiz should not imply the same breadth from a bounded slice.
- Giac/XCAS proves calculator engines can be deep, but it also raises feature-parity pressure Calcwiz should resist.
- SymEngine is lean and core-oriented, but it does not solve Calcwiz's result-surface honesty by itself.
- GeoGebra's polynomial evidence is tied to geometry/prover and CAS workflow rather than a standalone rational integration core.

## Calcwiz Relevance

The cross-source conclusion is that `INT-RAT1` should be small and domain-gated. The first valuable leap is not broad rational integration; it is reliable exact wins for the subset already supported internally:

- one variable
- exact rational coefficients
- normalized rational function
- proper or polynomial-division-ready quotient
- distinct rational linear denominator factors
- derivative/backcheck verification
- explicit stops for every unsupported case

## Non-Adoption Notes

Calcwiz should not adopt:

- FriCAS's full category/domain architecture.
- SageMath's platform-scale multi-engine dependency model.
- SymPy/Maxima broad transformation promises.
- Giac/XCAS feature-parity pressure.
- Source-mirror code, direct dependencies, or hidden runtime execution.
