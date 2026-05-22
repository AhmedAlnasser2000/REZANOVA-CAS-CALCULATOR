# AREA-ASSUMPTIONS0 Cross-Source Comparison

## Compared Sources

- Calcwiz: local typed facts in algebra, equation, calculus, and simplify-policy modules.
- FriCAS: domain/category context and typed mathematical structure.
- SymPy: explicit assumptions, set domains, `solveset` domains, and continuous-domain helpers.
- Maxima: global/interrogative assumption and sign systems.
- SageMath: parent/domain-aware object orchestration.
- Giac/XCAS: calculator-CAS assumptions, singularities, and piecewise/when behavior.
- SymEngine: lightweight predicate and set-oriented symbolic core.
- GeoGebra: CAS/graphing workflow pressure and visible undefined/validity behavior.

## Shared Patterns

- Strong systems do not treat equivalent expressions as automatically interchangeable without context.
- Domain facts must survive cancellation, equation transforms, integration, and display/readback.
- Singularities and exclusions matter as much as simplified forms.
- Branch/principal-range facts should be explicit when inverse functions, roots, logs, abs, or periodic families appear.
- User-facing systems need controlled stops when facts cannot be proven.
- Set or interval domains are the natural language for many solve/limit/integral/table hazards.

## Divergences

- FriCAS encodes much context in domain/category architecture.
- SymPy exposes a broad assumptions and set API.
- Maxima uses global session assumptions and interactive sign queries.
- SageMath coordinates many engines and parent domains.
- Giac/XCAS prioritizes practical calculator behavior, singularity handling, and assumptions tied to solving.
- SymEngine keeps assumptions comparatively small and core-facing.
- GeoGebra emphasizes visible workflow correctness across CAS and graphing.

## Calcwiz Relevance

Calcwiz should not choose one of these identities. It needs a bounded internal fact substrate:

- request-scoped, not global
- result-attached, not hidden
- typed enough for algebra/calculus/equation/table consumers
- small enough to test
- honest enough to stop when facts are missing

## Non-Adoption Notes

- Do not inherit FriCAS's full typed domain/category runtime.
- Do not expose a SymPy-sized public assumptions language.
- Do not adopt Maxima-style global mutable `assume` state.
- Do not make SageMath-style backend orchestration a product dependency.
- Do not chase Giac/XCAS calculator-CAS breadth.
- Do not reduce Calcwiz assumptions to SymEngine-level predicates only.
- Do not turn Calcwiz into GeoGebra-style graph-first workflow.
