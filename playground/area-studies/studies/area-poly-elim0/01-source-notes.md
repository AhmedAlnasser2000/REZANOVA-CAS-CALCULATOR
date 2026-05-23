# AREA-POLY-ELIM0 Source Notes

## Source

Calcwiz stable code.

## Relevant Capability

Calcwiz currently has bounded one-variable exact rational polynomial/rational-function substrates. `polynomial-core` owns coefficient arrays, degree, division, GCD, primitive/monic normalization, and one-variable parsing. `rational-function-core` owns denominator constraints and bounded partial-fraction readiness. It does not own multivariate polynomial systems, monomial orders, resultants, or Grobner bases.

## Enabling Pattern

The useful pattern is disciplined substrate ownership: exact one-variable routines are shared, typed, capped, and surrounded by structured stops. That is the right style for future elimination work.

## Cost

The current shape is intentionally narrow. Extending it directly into multivariate elimination would mix representation, term ordering, coefficient domains, exact matrix operations, and solver strategy in one jump.

## Calcwiz Translation Hint

Add no elimination feature until Calcwiz has a studied exact-linear-algebra substrate and a bounded multivariate polynomial representation proposal.

## Source

FriCAS static mirror.

## Relevant Capability

FriCAS has deep algebra libraries for domains, categories, distributed/generalized polynomial representations, Grobner bases, zero-dimensional ideals, and elimination-oriented workflows. Source areas such as `src/algebra/gdpoly.spad`, `src/algebra/lingrob.spad`, `src/algebra/zerodim.spad`, and related Grobner files show that elimination is not a standalone trick; it sits on typed polynomial domains and exact algebra infrastructure.

## Enabling Pattern

Power comes from typed domains/categories, exact coefficient domains, ordered polynomial representations, and algorithm packages that compose with linear algebra.

## Cost

FriCAS's full category/domain runtime is too heavy for Calcwiz to inherit. The lesson is substrate layering, not architecture adoption.

## Calcwiz Translation Hint

Translate only the smallest bounded ideas: explicit coefficient domain, monomial ordering, exact linear-algebra prerequisite, and honest stops for unsupported ideals.

## Source

SymPy static mirror.

## Relevant Capability

SymPy exposes resultants, Grobner bases, polynomial rings, monomial orderings, and algorithm choices through `sympy/polys`. Files such as `polytools.py`, `groebnertools.py`, `euclidtools.py`, and `multivariate_resultants.py` show a layered polynomial subsystem with exact domains and multiple algorithms.

## Enabling Pattern

SymPy separates expression conversion, polynomial rings, domains, algorithms, and user-facing wrappers. It also treats monomial order and domain as explicit algorithm inputs.

## Cost

The breadth of the `polys` subsystem is much larger than Calcwiz should implement now.

## Calcwiz Translation Hint

Borrow the idea of an explicit polynomial-ring descriptor and monomial-order parameter, not the whole public API surface.

## Source

Maxima static mirror.

## Relevant Capability

Maxima contains classic CAS support for resultants, elimination, and Grobner-related workflows across core and share libraries. Its value here is historical CAS behavior: resultants and elimination appear as user-facing algebra operations with broad expression simplification around them.

## Enabling Pattern

Maxima's pattern is a practical symbolic system that lets resultants/elimination interact with simplification and equation solving.

## Cost

Global-style assumptions, broad simplification coupling, and session-level behavior are not a good Calcwiz fit.

## Calcwiz Translation Hint

Keep any future elimination slice result-envelope-owned and assumption-fact-aware instead of making it a broad expression-level side effect.

## Source

SageMath static mirror.

## Relevant Capability

SageMath mainly demonstrates orchestration. It wraps specialized algebra systems and includes interfaces to Singular-style Grobner and polynomial ideal functionality, plus benchmark/ideal datasets.

## Enabling Pattern

Sage shows that serious elimination work often uses a dedicated algebra engine with parent/ring/category metadata and benchmark families.

## Cost

Calcwiz should not become a multi-backend platform in this milestone family.

## Calcwiz Translation Hint

Use Sage as evidence that ring/parent metadata and benchmark families matter. Do not copy the orchestration identity.

## Source

Giac/XCAS static mirror.

## Relevant Capability

Giac/XCAS has calculator-oriented CAS support for `resultant`, `gbasis`, `eliminate`, polynomial solving, and practical resultants/Grobner routes in files such as `solve.cc`, `sym2poly.cc`, `gausspol.cc`, `modpoly.cc`, and display/menu command lists.

## Enabling Pattern

Giac's useful evidence is product realism: a calculator-style CAS exposes elimination commands but depends on a substantial exact polynomial and solving backend.

## Cost

The engine is far broader than Calcwiz's current bounded architecture. Copying its surface would create capability claims Calcwiz cannot honestly support.

## Calcwiz Translation Hint

For Calcwiz, any future `POLY-ELIM1` should expose only a narrow internal capability first, not calculator-wide commands.

## Source

SymEngine static mirror.

## Relevant Capability

SymEngine emphasizes fast symbolic primitives, monomial/polynomial representations, and exact-style core data structures. It does not appear to be the broad elimination engine among the mirrors.

## Enabling Pattern

The useful pattern is keeping core representation compact and efficient.

## Cost

Minimal cores alone do not answer resultants/Grobner policy, assumptions, or readback.

## Calcwiz Translation Hint

Use SymEngine as evidence for lightweight representation boundaries, not as evidence that elimination can skip higher-level algebra policy.

## Source

GeoGebra static mirror.

## Relevant Capability

GeoGebra is mainly workflow evidence for CAS/geometry interaction. Its CAS stack relies heavily on Giac; therefore, for elimination internals, Giac/XCAS is the stronger technical source.

## Enabling Pattern

GeoGebra shows why user-facing algebra and geometry workflows need domain and visibility discipline.

## Cost

Graphing and geometry UI pressure should not pull elimination into product scope before the calculator core stabilizes.

## Calcwiz Translation Hint

Keep graphing deferred. Use GeoGebra only as workflow evidence for future fact/readback expectations.
