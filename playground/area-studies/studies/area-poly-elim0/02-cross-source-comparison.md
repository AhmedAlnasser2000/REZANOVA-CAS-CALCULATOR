# AREA-POLY-ELIM0 Cross-Source Comparison

## Compared Sources

Compared sources:

- Calcwiz
- FriCAS
- SymPy
- Maxima
- SageMath
- Giac/XCAS
- SymEngine
- GeoGebra

## Shared Patterns

The capable systems share several patterns:

- elimination is built on an explicit polynomial representation, not generic expression rewriting
- coefficient domains matter before algorithms run
- monomial ordering is part of the problem input
- resultants, subresultants, and Grobner bases depend on exact arithmetic discipline
- Grobner/FGLM-style workflows often use exact linear algebra internally
- solving is layered on top of elimination facts rather than fused with every solver rule
- assumptions/domain facts must survive transformations because elimination can introduce extraneous candidates or remove constraints

## Divergences

Calcwiz:

- one-variable exact rational polynomial core only
- no multivariate term model
- no exact linear algebra core over rational coefficients

FriCAS:

- typed algebraic domain/category depth
- broad polynomial packages and Grobner/elimination algorithms

SymPy:

- explicit domains, polynomial rings, and monomial orders
- broad but user-facing `polys` API

Maxima:

- classic CAS style with broad simplification/solve coupling

SageMath:

- orchestration over specialized systems, especially for ideals/Grobner work

Giac/XCAS:

- calculator-style CAS breadth with practical elimination commands

SymEngine:

- compact fast core, not broad elimination policy

GeoGebra:

- workflow and CAS/geometry evidence, largely Giac-backed for CAS depth

## Calcwiz Relevance

The biggest Calcwiz gap is not one missing function. It is the lack of the exact infrastructure package that elimination assumes:

- multivariate polynomial value model
- monomial/term ordering
- exact rational matrix operations
- coefficient-domain gate
- result envelope for generated constraints/candidate facts
- stop taxonomy for unsupported term growth and domain loss

## Non-Adoption Notes

Do not adopt:

- FriCAS's full type/category architecture
- SymPy's broad public polynomial API all at once
- Maxima's global assumption/session coupling
- SageMath's backend-orchestration identity
- Giac/XCAS's full calculator CAS command surface
- SymEngine-only minimalism that lacks product readback policy
- GeoGebra's graph-first sequencing

Calcwiz should translate patterns into bounded native cores only.
