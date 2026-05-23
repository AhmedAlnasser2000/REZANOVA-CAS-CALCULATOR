# AREA-MULTIVAR0 Cross-Source Comparison

## Compared Sources

- Calcwiz
- FriCAS
- SymPy
- Maxima
- SageMath
- Giac/XCAS
- SymEngine
- GeoGebra

## Shared Patterns

- Serious symbolic systems do not treat all identifiers the same.
- Algorithms need explicit variable/generator/target choices.
- Non-target symbols become parameters, known values, ring generators, or unsupported inputs depending on context.
- Product workflows need visible disambiguation when multiple interpretations are possible.
- Hidden session state is dangerous unless replay and readback explain it.

## Divergences

- FriCAS and SageMath lean on typed domains, parents, and algebraic structures.
- SymPy exposes broad symbolic objects and assumptions.
- Maxima favors traditional session state and global assumptions.
- Giac/XCAS exposes calculator-style commands with variable arguments.
- SymEngine stays closer to a lean symbolic representation layer.
- GeoGebra emphasizes workflow and object context more than algebra-core purity.
- Calcwiz currently favors bounded mode-specific one-variable workflows.

## Calcwiz Relevance

Calcwiz should not inherit any one source's identity. The useful common pattern is smaller: collect symbols, classify roles, and make target/parameter/stored-value decisions explicit before execution.

This directly affects:

- Equation: solve target versus parameter
- Calculate: symbolic expression versus stored-value evaluation
- Calculus: active and bound variables
- Table: independent variable and sampled-domain facts
- history: replay of role choices
- assumptions: facts scoped to variables
- future elimination: bivariate projection choices

## Non-Adoption Notes

- Do not inherit FriCAS's full category runtime.
- Do not inherit SymPy's broad assumptions API.
- Do not inherit Maxima-style hidden global assumptions.
- Do not inherit SageMath's platform/backend parent identity.
- Do not inherit Giac/XCAS full CAS command breadth.
- Do not inherit SymEngine-only minimalism without product semantics.
- Do not inherit GeoGebra's graph-first sequencing.
