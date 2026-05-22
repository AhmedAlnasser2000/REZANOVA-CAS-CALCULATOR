# AREA-POLY-RAT1 Source Notes

These notes are static-source observations only. Paths are evidence pointers; no implementation code is copied or executed.

## Source

### Calcwiz

- `src/lib/algebra/polynomial-core.ts`
- `src/lib/algebra/rational-function-core.ts`
- `src/lib/algebra/polynomial-factor-solve.ts`
- `src/lib/symbolic-engine/rational.ts`
- `src/lib/symbolic-engine/integration.ts`
- `.memory/research/readiness/poly-core-readiness-matrix.md`
- `.memory/research/readiness/poly-rat-core0-readiness-matrix.md`

## Relevant Capability

Calcwiz owns a bounded one-variable exact polynomial/rational substrate: exact rational coefficients, AST parsing under caps, degree/coeff access, arithmetic, division, GCD, primitive/monic normalization, quotient cancellation, denominator constraints, distinct-linear partial-fraction readiness, and `INT-RAT1` integration adoption.

It does not yet own a general coefficient-domain model, square-free factorization, repeated-factor partial fractions, irreducible-quadratic decomposition, resultants, Grobner/elimination, algebraic-number coefficients, modular arithmetic, or multivariate polynomial algebra.

## Enabling Pattern

The useful local pattern is small typed substrate ownership with stop reasons. Stable calculus now consumes rational readiness instead of inventing calculus-local algebra.

## Cost

The substrate is intentionally narrow and number-backed. It is excellent for honest slices, but it cannot support broad POLY/RAT promises without new coefficient-domain and factorization readiness.

## Calcwiz Translation Hint

Keep `polynomial-core` and `rational-function-core` as the owner boundary. Plan `POLY-RAT-CORE1` before any `INT-RAT2` widening.

## Source

### FriCAS

- `playground/sources/mirrors/fricas/src/algebra/polycat.spad`
- `playground/sources/mirrors/fricas/src/algebra/poly.spad`
- `playground/sources/mirrors/fricas/src/algebra/multpoly.spad`
- `playground/sources/mirrors/fricas/src/algebra/fraction.spad`
- `playground/sources/mirrors/fricas/src/algebra/fparfrac.spad`
- `playground/sources/mirrors/fricas/src/algebra/multsqfr.spad`
- `playground/sources/mirrors/fricas/src/algebra/pgrobner.spad`

## Relevant Capability

FriCAS treats polynomial and rational work as algebraic structures over explicit coefficient domains. Its evidence spans monoid-ring polynomial categories, localization/fractions, full partial fractions, multivariate square-free decomposition, and Grobner interfaces.

## Enabling Pattern

The power comes from domain/category discipline: coefficient rings/fields, monomial/exponent structures, polynomial categories, fraction domains, and package-level operations compose systematically.

## Cost

The architecture is much heavier than Calcwiz should inherit. It is powerful because of the type/domain system, but that same generality would distort a bounded desktop workbench if imported wholesale.

## Calcwiz Translation Hint

Translate the discipline into readiness facts: coefficient-domain gates, factorization tiers, and explicit owner layers. Do not copy the category architecture.

## Source

### SymPy

- `playground/sources/mirrors/sympy/sympy/polys/constructor.py`
- `playground/sources/mirrors/sympy/sympy/polys/polytools.py`
- `playground/sources/mirrors/sympy/sympy/polys/domains/rationalfield.py`
- `playground/sources/mirrors/sympy/sympy/polys/sqfreetools.py`
- `playground/sources/mirrors/sympy/sympy/polys/partfrac.py`
- `playground/sources/mirrors/sympy/sympy/polys/groebnertools.py`
- `playground/sources/mirrors/sympy/sympy/integrals/rationaltools.py`

## Relevant Capability

SymPy provides the clearest practical model for staged conversion from expressions into polynomial/rational domains, with separate domain construction, polynomial tools, rational fields, square-free algorithms, partial fractions, and Grobner tools.

## Enabling Pattern

The strongest lesson is not one algorithm; it is the conversion gate. Expressions become domain-backed polynomial/rational objects before serious algorithms run.

## Cost

SymPy's breadth can blur exact, approximate, algebraic, and expression-domain behavior unless Calcwiz keeps stricter stop reasons and smaller surfaces.

## Calcwiz Translation Hint

Use SymPy as evidence for `POLY-RAT-CORE1`: square-free/factor readiness and partial-fraction modes should be substrate facts, not calculus features.

## Source

### Maxima

- `playground/sources/mirrors/maxima/src/factor.lisp`
- `playground/sources/mirrors/maxima/src/ezgcd.lisp`
- `playground/sources/mirrors/maxima/src/result.lisp`
- `playground/sources/mirrors/maxima/src/rat3*.lisp`
- `playground/sources/mirrors/maxima/share/integration/hermite_reduce.mac`
- `playground/sources/mirrors/maxima/share/to_poly_solve/`
- `playground/sources/mirrors/maxima/share/contrib/Grobner/grobner.lisp`

## Relevant Capability

Maxima is strong context for classic CAS rational representation, factorization, EZ-GCD, resultants, polynomial conversion for solving, rational integration reductions, and contributed Grobner workflows.

## Enabling Pattern

The useful lesson is staged algebraic normalization through historical rational/polynomial forms, plus many regression-style examples that expose real user families.

## Cost

The control style is broad and historically layered. Calcwiz should not inherit implicit global switches or broad transform behavior without typed gates.

## Calcwiz Translation Hint

Mine benchmark families and stop cases. Keep implementation ownership in typed Calcwiz cores.

## Source

### SageMath

- `playground/sources/mirrors/sagemath/src/sage/rings/polynomial/`
- `playground/sources/mirrors/sagemath/src/sage/rings/fraction_field.py`
- `playground/sources/mirrors/sagemath/src/sage/rings/function_field/`
- `playground/sources/mirrors/sagemath/src/sage/rings/number_field/`
- `playground/sources/mirrors/sagemath/src/sage/rings/finite_rings/`
- `playground/sources/mirrors/sagemath/src/sage/libs/singular/`

## Relevant Capability

SageMath shows platform-scale polynomial/rational power across polynomial rings, fraction fields, function fields, number fields, finite fields, term orders, ideals, and Singular-backed Grobner/elimination.

## Enabling Pattern

The key pattern is orchestration over specialized algebra systems and explicit mathematical parent structures.

## Cost

SageMath-scale platform orchestration is not a near-term Calcwiz product strategy. It would create backend and packaging pressure before Calcwiz has stable coefficient-domain and exact-linear-algebra cores.

## Calcwiz Translation Hint

Use SageMath to understand long-term layering and source boundaries. Do not make multi-backend orchestration a shortcut for missing native cores.

## Source

### Giac/XCAS

- `playground/sources/mirrors/giac-xcas/src/giac/cpp/sym2poly.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/modpoly.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/modfactor.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/intgab.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/risch.cc`
- `playground/sources/mirrors/giac-xcas/src/test/gbasis/`
- `playground/sources/mirrors/giac-xcas/src/test/eliminate/`

## Relevant Capability

Giac/XCAS is the closest calculator-engine evidence: symbolic-to-polynomial conversion, dense/modular polynomial work, factorization, rational normalization, integration, Risch-related files, and calculator-style Grobner/elimination tests.

## Enabling Pattern

It proves a calculator-shaped product can hide deep polynomial/rational machinery behind fast practical workflows.

## Cost

It also creates dangerous parity pressure. Calcwiz must not become "Giac with a different UI" or import GPL engine logic.

## Calcwiz Translation Hint

Borrow the product lesson: deep core capability can stay behind guided, honest surfaces. Keep Calcwiz-native implementation and no dependency.

## Source

### SymEngine

- `playground/sources/mirrors/symengine/symengine/polys/`
- `playground/sources/mirrors/symengine/symengine/polys/cancel.h`
- `playground/sources/mirrors/symengine/symengine/rational.*`
- `playground/sources/mirrors/symengine/symengine/rings.*`
- `playground/sources/mirrors/symengine/symengine/tests/polynomial/`

## Relevant Capability

SymEngine is evidence for lean symbolic-core representation, polynomial conversion/cancellation, univariate rational polynomial types, and performance-focused tests.

## Enabling Pattern

The useful pattern is a narrow core boundary with efficient types, not a huge symbolic product surface.

## Cost

A fast-core rewrite would be premature. Calcwiz should avoid replacing the TypeScript substrate until the exact scope and Rust/kernel boundary are clearer.

## Calcwiz Translation Hint

Use SymEngine to shape future exact scalar and polynomial-core interface discipline.

## Source

### GeoGebra

- `playground/sources/mirrors/geogebra/source/shared/common/src/main/java/org/geogebra/common/cas/`
- `playground/sources/mirrors/geogebra/source/shared/common/src/main/java/org/geogebra/common/cas/giac/`
- `playground/sources/mirrors/geogebra/source/desktop/desktop/src/test/java/org/geogebra/cas/`
- `playground/sources/mirrors/geogebra/source/desktop/desktop/src/test/java/org/geogebra/common/kernel/commands/`
- `playground/sources/mirrors/geogebra/source/shared/common-jre/src/testFixtures/java/org/geogebra/test/matcher/IsEqualPolynomialEquation.java`

## Relevant Capability

GeoGebra is less a polynomial-core model and more a CAS workflow/product integration model. It shows how CAS, dynamic geometry, commands, symbolic tests, and Giac-backed evaluation are mediated through product behavior.

## Enabling Pattern

The value is user-workflow translation: symbolic commands need app-level expectations, not only algebraic correctness.

## Cost

GeoGebra has mixed licensing/product assets and service-adjacent workflow assumptions. Calcwiz must not copy UI/assets or inherit app identity.

## Calcwiz Translation Hint

Use GeoGebra for workflow and test-family evidence, especially how symbolic outputs meet user-facing command surfaces.
