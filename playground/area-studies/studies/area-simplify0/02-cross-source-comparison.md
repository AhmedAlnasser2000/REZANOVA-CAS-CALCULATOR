# AREA-SIMPLIFY0 Cross-Source Comparison

## Compared Sources

| Source | Simplification shape | Calcwiz lesson |
| --- | --- | --- |
| Calcwiz | Bounded shipped transforms spread across engine, algebra helpers, trig, calculus, and display. | Consolidate policy before adding more visible rational/calculus output. |
| FriCAS | Expression manipulation tied to algebraic domains and expression structure. | Domain context matters; do not inherit full category architecture. |
| SymPy | Separate simplify, ratsimp, trigsimp, radsimp, powsimp, and rewrite families. | Simplification is a toolkit with form-specific choices, not one operation. |
| Maxima | Mature classic simplification and rational/trig packages with global-style behavior. | Mine examples but avoid implicit global switches. |
| SageMath | Platform orchestration over symbolic expressions, assumptions, conversions, and engines. | Assumptions and conversions are policy inputs, but multi-backend delegation is deferred. |
| Giac/XCAS | Calculator-engine practical simplification and CAS command workflow. | User-facing workflow needs readable output and stable form intent. |
| SymEngine | Lean structural simplification, expansion, rewriting, and numerator/denominator facts. | A compact core is valuable but not enough for assumptions/readback. |
| GeoGebra | Product CAS/geometry workflow over Giac-backed symbolic commands. | Output must fit the product surface, not leak raw engine internals. |

## Shared Patterns

- Simplification is split into form-specific families.
- Conversion/domain gates come before trustworthy algebraic rewrites.
- Equivalent expressions are not always interchangeable for users.
- Readable output can be more valuable than canonical output when provenance is clear.
- Denominator/domain facts must survive cancellations and transformations.
- Broad simplification without assumptions creates fake exactness risk.

## Divergences

- FriCAS and SageMath optimize for general mathematical infrastructure.
- SymPy and Maxima expose broad practical APIs and knobs.
- Giac/XCAS and GeoGebra optimize for calculator/product workflow.
- SymEngine emphasizes a compact internal core.
- Calcwiz needs a smaller policy layer that protects bounded workbench trust.

## Calcwiz Relevance

Calcwiz should not try to implement broad simplification now. It should first make a shared policy layer that says which form is intended, which assumptions justify replacement, which constraints must be preserved, and when output should stop as unsupported.

This matters before `INT-RAT2` because repeated-linear and irreducible-quadratic rational antiderivatives can produce equivalent but very different rational, log, and arctan forms.

## Non-Adoption Notes

Calcwiz should not inherit:

- FriCAS's full domain/category machinery.
- SymPy's broad public simplification API expectations.
- Maxima's global option/switch style.
- SageMath's multi-engine orchestration as a shortcut.
- Giac/XCAS feature breadth or calculator parity pressure.
- SymEngine core rewrite pressure.
- GeoGebra UI/service identity or assets.
