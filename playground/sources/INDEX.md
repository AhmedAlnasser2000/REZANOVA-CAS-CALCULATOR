# Playground Source Mirror Index

This index lists external CAS/math-system repositories registered as Calcwiz research-context mirrors.

Mirror payloads are intentionally ignored. The committed source of truth is the metadata under `metadata/`.

| mirror_id | title | status | metadata | local mirror path | primary Calcwiz value |
| --- | --- | --- | --- | --- | --- |
| `fricas` | FriCAS | `active` | [metadata](./metadata/fricas.yaml) | `playground/sources/mirrors/fricas/` | Deep CAS power, typed algebraic structures, symbolic integration, and broad exact capability context. |
| `sympy` | SymPy | `active` | [metadata](./metadata/sympy.yaml) | `playground/sources/mirrors/sympy/` | Practical modern symbolic API, expression trees, assumptions, simplification, and Python-facing CAS usability. |
| `maxima` | Maxima | `active` | [metadata](./metadata/maxima.yaml) | `playground/sources/mirrors/maxima/` | Classic CAS behavior, symbolic solving, calculus tradition, and historically simpler CAS architecture. |
| `sagemath` | SageMath | `active` | [metadata](./metadata/sagemath.yaml) | `playground/sources/mirrors/sagemath/` | Ecosystem orchestration, broad math environment packaging, and multi-engine platform lessons. |
| `giac-xcas` | Giac / XCAS | `active` | [metadata](./metadata/giac-xcas.yaml) | `playground/sources/mirrors/giac-xcas/` | Calculator-style CAS realism, performance-oriented symbolic math, and embedded/handheld tradeoffs. |
| `symengine` | SymEngine | `active` | [metadata](./metadata/symengine.yaml) | `playground/sources/mirrors/symengine/` | Minimal fast symbolic core design, efficient expression representation, and lightweight engine boundaries. |
| `geogebra` | GeoGebra | `active` | [metadata](./metadata/geogebra.yaml) | `playground/sources/mirrors/geogebra/` | Dynamic geometry, CAS-facing interaction design, construction state, and math-authoring workflow lessons. |
| `integration-rules` | RuleBasedIntegration IntegrationRules | `active` | [metadata](./metadata/integration-rules.yaml) | `playground/sources/mirrors/integration-rules/` | Primary Rubi rule corpus for bounded Calcwiz-native symbolic integration translation planning. |

## Registry Rule

Register a source mirror here before using it for durable Calcwiz research. Local clones belong only under the matching ignored `mirrors/<mirror-id>/` path.
