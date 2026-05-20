# FriCAS To Calcwiz Fit Matrix

milestone: FRICAS-CTX0  
date: 2026-05-01

| FriCAS area | Calcwiz relevance | Value type | Smallest bounded Calcwiz version | Owning layer | Main prerequisite | Main risk |
| --- | --- | --- | --- | --- | --- | --- |
| Domain/category discipline | immediate | architectural | capability facts for existing cores | kernel/algebra core | typed readiness metadata | architecture drift |
| Type resolution/coercion | mid-term | representational | explicit carrier adapters with refusal reasons | algebra core | stable carrier types | hidden magic coercion |
| Expression kernel/function space | mid-term | representational | known-function registry and carrier recognition | algebra core | AST/readback discipline | replacing Calcwiz AST identity |
| Simplification policy | immediate | mathematical/UX | bounded rewrite policy with domain notes | algebra core/orchestrator | domain-range facts | unsafe rewrites |
| Symbolic integration architecture | immediate to mid-term | mathematical | strategy normalization plus derivative verification | calculus core | polynomial/domain readiness | unbounded Risch pressure |
| Definite integration pole safety | immediate | mathematical/UX | stronger interval hazard classification | calculus core/domain-range core | interval safety facts | false trust in numeric fallback |
| MRV/asymptotic limits | long-term | mathematical | bounded asymptotic dominance prototype | Playground first | series/sign facts | hidden general engine |
| Polynomial algebra | immediate to mid-term | mathematical | exact polynomial-core readiness map | algebra core | factor/gcd/cancel tests | overbuilding hierarchy |
| Grobner bases | mid-term | mathematical | tiny bounded elimination prototype | Playground first | exact polynomial ring | black-box solve claims |
| Regular chains | long-term | mathematical/representational | decomposition vocabulary only at first | Playground only | branch/domain model | too heavy for product |
| Exact linear algebra | later after audit | mathematical/product | first audit current Matrix/Vector modes, then define a reusable vector/matrix core boundary before exact coefficients | algebra core | `VEC-MAT-AUDIT0` plus result-envelope design | mistaking numeric workspaces for reusable cores |
| Series/special functions | mid-term to long-term | calculus/UX | bounded series display and challenge corpus | calculus core/Playground | function registry | branch validity |
| Interpreter/database architecture | mostly never | architecture | lessons for module registry only | kernel/tooling | real plugin pressure | bootstrap complexity |
| Regression input culture | immediate | evidence | challenge corpora and future golden candidates | Playground/.memory | corpus taxonomy | parity pressure |

## Near-Term Fit

Best immediate translations:

1. capability facts for algebra/calculus prerequisites,
2. bounded simplification policy with domain notes,
3. polynomial-core readiness map,
4. integration strategy normalization,
5. vector/matrix core readiness before exact linear algebra capability gates.

## Long-Term Or Playground-Only Fit

- MRV limits, Grobner, regular chains, broad special functions, and general type coercion belong in Playground first.
- If any one of these produces a useful result, it should graduate by a Calcwiz-native bounded extraction, not by importing FriCAS structure.

## Bad Fit

- Full FriCAS identity.
- Runtime dependency or hidden backend.
- Generalized type system as product foundation.
- Broad feature parity as a roadmap metric.
