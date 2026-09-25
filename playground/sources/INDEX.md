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
| `equation-io` | Equation.io | `active` | [metadata](./metadata/equation-io.yaml) | `playground/sources/mirrors/equation-io/` | GPU-native interactive graphing, dynamic systems, vector fields, visual probability, and graph-language comparison context. |
| `integration-rules` | RuleBasedIntegration IntegrationRules | `active` | [metadata](./metadata/integration-rules.yaml) | `playground/sources/mirrors/integration-rules/` | Primary Rubi rule corpus for bounded Calcwiz-native symbolic integration translation planning. |
| `symbolica` | Symbolica | `active` | [metadata](./metadata/symbolica.yaml) | `playground/sources/mirrors/symbolica/` | Coefficient domains, compact expressions, polynomial algorithms, and numerical evaluator research; custom source-available terms. |
| `numpy` | NumPy | `active` | [metadata](./metadata/numpy.yaml) | `playground/sources/mirrors/numpy/` | Array storage, dtypes, broadcasting, ufunc dispatch, SIMD, and numerical array APIs. |
| `scipy` | SciPy | `active` | [metadata](./metadata/scipy.yaml) | `playground/sources/mirrors/scipy/` | Optimization, integration and ODEs, sparse matrices, statistics, signal processing, and numerical algorithms. |
| `flint` | FLINT | `active` | [metadata](./metadata/flint.yaml) | `playground/sources/mirrors/flint/` | Exact coefficient arithmetic, modular algorithms, polynomial arithmetic, exact matrices, and ball arithmetic. |
| `singular` | Singular | `active` | [metadata](./metadata/singular.yaml) | `playground/sources/mirrors/singular/` | Polynomial rings, Groebner bases, elimination, ideals, and computational algebraic geometry. |
| `openblas` | OpenBLAS | `active` | [metadata](./metadata/openblas.yaml) | `playground/sources/mirrors/openblas/` | Optimized BLAS kernels, numerical matrix multiplication, blocking, SIMD, and threading. |
| `lapack` | Reference LAPACK | `active` | [metadata](./metadata/lapack.yaml) | `playground/sources/mirrors/lapack/` | Numerical matrix factorizations, linear solves, eigenproblems, SVD, conditioning, and reference BLAS. |
| `mathics3` | Mathics3 Core | `active` | [metadata](./metadata/mathics3.yaml) | `playground/sources/mirrors/mathics3/` | Symbolic evaluation, patterns, rewrite rules, built-in extensions, and backend conversion boundaries. |
| `symbolics` | Symbolics.jl | `active` | [metadata](./metadata/symbolics.yaml) | `playground/sources/mirrors/symbolics/` | Symbolic operations, differentiation, solving, arrays, and numerical function generation. |
| `symbolicutils` | SymbolicUtils.jl | `active` | [metadata](./metadata/symbolicutils.yaml) | `playground/sources/mirrors/symbolicutils/` | Expression representation, canonicalization, simplification, and rewriting. |
| `terminterface` | TermInterface.jl | `active` | [metadata](./metadata/terminterface.yaml) | `playground/sources/mirrors/terminterface/` | Mathematical term inspection across different representations. |
| `metatheory` | Metatheory.jl | `active` | [metadata](./metadata/metatheory.yaml) | `playground/sources/mirrors/metatheory/` | Equality saturation, rewrite rules, and expression cost selection. |
| `groebner` | Groebner.jl | `active` | [metadata](./metadata/groebner.yaml) | `playground/sources/mirrors/groebner/` | Polynomial arithmetic, F4 Groebner bases, and elimination. |
| `symbolicintegration` | SymbolicIntegration.jl | `active` | [metadata](./metadata/symbolicintegration.yaml) | `playground/sources/mirrors/symbolicintegration/` | Risch and rule-based symbolic integration. |
| `reversepropagation` | ReversePropagation.jl | `active` | [metadata](./metadata/reversepropagation.yaml) | `playground/sources/mirrors/reversepropagation/` | Automatic differentiation and interval contraction. |
| `modelingtoolkit` | ModelingToolkit.jl | `active` | [metadata](./metadata/modelingtoolkit.yaml) | `playground/sources/mirrors/modelingtoolkit/` | Isolated mathematical transformations, sparsity, and derivative generation; framework adoption excluded. |
| `datadrivendiffeq` | DataDrivenDiffEq.jl | `active` | [metadata](./metadata/datadrivendiffeq.yaml) | `playground/sources/mirrors/datadrivendiffeq/` | Mathematical equation identification from data. |
| `symbolicregression` | SymbolicRegression.jl | `active` | [metadata](./metadata/symbolicregression.yaml) | `playground/sources/mirrors/symbolicregression/` | Formula search, fitting, and expression complexity. |

## Registry Rule

Register a source mirror here before using it for durable Calcwiz research. Local clones belong only under the matching ignored `mirrors/<mirror-id>/` path.
