# AREA-POLY-RAT0 Source Notes

These notes are static-source observations only. They cite paths as context evidence and do not copy implementation code.

## Source

### Calcwiz

- `src/lib/algebra/polynomial-core.ts`
- `src/lib/algebra/rational-function-core.ts`
- `.memory/research/readiness/poly-core-readiness-matrix.md`
- `.memory/research/readiness/poly-rat-core0-readiness-matrix.md`

## Relevant Capability

Calcwiz already has a bounded one-variable exact rational polynomial substrate, polynomial division/GCD, rational-function normalization, denominator constraints, and a distinct-linear partial-fraction readiness helper.

## Enabling Pattern

The useful pattern is bounded exact ownership: exact rational scalars, caller-owned degree caps, structured stop reasons, and product adapters that preserve shipped behavior.

## Cost

The substrate is intentionally narrow. It does not yet own square-free factorization, resultants, broad partial fractions, coefficient-domain abstraction, or exact linear algebra.

## Calcwiz Translation Hint

Use the current substrate directly for a narrow `INT-RAT1`. Do not widen calculus locally; unsupported rational shapes should become controlled stops.

## Source

### FriCAS

- `playground/sources/mirrors/fricas/src/algebra/poly.spad`
- `playground/sources/mirrors/fricas/src/algebra/polycat.spad`
- `playground/sources/mirrors/fricas/src/algebra/fraction.spad`
- `playground/sources/mirrors/fricas/src/algebra/fparfrac.spad`
- `playground/sources/mirrors/fricas/src/algebra/groebf.spad`
- `playground/sources/mirrors/fricas/src/algebra/groebsol.spad`
- `playground/sources/mirrors/fricas/src/algebra/pgrobner.spad`

## Relevant Capability

FriCAS shows a broad domain/category algebra model where polynomial, fraction, partial-fraction, and Grobner-style machinery are first-class algebraic structures rather than isolated utilities.

## Enabling Pattern

The power comes from typed algebraic domains, categories, and package-level operations that compose over coefficient rings and fields.

## Cost

That model is heavy for Calcwiz's desktop workbench. Pulling the whole domain/category worldview into Calcwiz would distort the bounded exact-first architecture.

## Calcwiz Translation Hint

Translate the discipline, not the architecture: explicit coefficient-domain facts, structured operation ownership, and clear prerequisite gates.

## Source

### SymPy

- `playground/sources/mirrors/sympy/sympy/polys/polytools.py`
- `playground/sources/mirrors/sympy/sympy/polys/rings.py`
- `playground/sources/mirrors/sympy/sympy/polys/constructor.py`
- `playground/sources/mirrors/sympy/sympy/polys/sqfreetools.py`
- `playground/sources/mirrors/sympy/sympy/polys/partfrac.py`
- `playground/sources/mirrors/sympy/sympy/polys/rationaltools.py`
- `playground/sources/mirrors/sympy/sympy/polys/groebnertools.py`

## Relevant Capability

SymPy exposes practical expression-to-polynomial conversion, domain-aware polynomial tools, rational simplification, square-free tools, partial fractions, and Grobner algorithms.

## Enabling Pattern

The strongest lesson is staged conversion: expression input is first coerced into polynomial/rational domains with explicit domain decisions before algorithms run.

## Cost

SymPy carries broad assumptions, domains, and expression rewrite pressure. Calcwiz should avoid presenting SymPy-style breadth until stop reasons and domain policy are equally explicit.

## Calcwiz Translation Hint

Adopt staged conversion and domain facts. Keep algorithms much smaller and typed through Calcwiz readiness descriptors.

## Source

### Maxima

- `playground/sources/mirrors/maxima/src/factor.lisp`
- `playground/sources/mirrors/maxima/src/polynomialp.lisp`
- `playground/sources/mirrors/maxima/src/polyrz.lisp`
- `playground/sources/mirrors/maxima/src/cpoly.lisp`
- `playground/sources/mirrors/maxima/share/to_poly_solve/to_poly.lisp`
- `playground/sources/mirrors/maxima/share/to_poly_solve/to_poly_solve.mac`
- `playground/sources/mirrors/maxima/share/solve_rat_ineq/solve_rat_ineq.mac`

## Relevant Capability

Maxima is useful evidence for classic CAS workflows: factor-first manipulation, polynomial tests, rational solving utilities, and symbolic transformation into polynomial form.

## Enabling Pattern

The enabling pattern is opportunistic normalization into algebraic forms with fallback to older broad symbolic routines.

## Cost

The style is historically powerful but less aligned with Calcwiz's need for small typed stop reasons and product-surface honesty.

## Calcwiz Translation Hint

Borrow the family of transformations to test, not the control style. Calcwiz should require exact conversion contracts before acting.

## Source

### SageMath

- `playground/sources/mirrors/sagemath/src/sage/rings/polynomial/`
- `playground/sources/mirrors/sagemath/src/sage/symbolic/ginac/`
- `playground/sources/mirrors/sagemath/src/sage/matrix/matrix_polynomial_dense.pyx`
- `playground/sources/mirrors/sagemath/subprojects/packagefiles/flint/src/flint/fmpz_poly.h`
- `playground/sources/mirrors/sagemath/subprojects/packagefiles/flint/src/flint/fmpq_poly.h`
- `playground/sources/mirrors/sagemath/subprojects/packagefiles/flint/src/flint/fmpz_mpoly.h`

## Relevant Capability

SageMath is ecosystem evidence: it routes polynomial, rational, matrix, and symbolic work across mature engines and libraries.

## Enabling Pattern

The main lesson is orchestration and domain selection over proven kernels.

## Cost

Sage-like platform breadth is far beyond Calcwiz's current release scale and would turn a desktop calculator into a distribution platform too early.

## Calcwiz Translation Hint

Keep SageMath as future platform context for profiles/adapters. For `INT-RAT1`, use it only to remind us that domain routing must be explicit.

## Source

### Giac/XCAS

- `playground/sources/mirrors/giac-xcas/src/giac/cpp/sym2poly.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/modpoly.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/modfactor.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/solve.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/headers/poly.h`
- `playground/sources/mirrors/giac-xcas/src/giac/headers/fraction.h`
- `playground/sources/mirrors/giac-xcas/src/test/gbasis/`
- `playground/sources/mirrors/giac-xcas/src/test/eliminate/`

## Relevant Capability

Giac/XCAS is strong calculator-engine evidence for symbolic-to-polynomial conversion, modular polynomial operations, factorization, solving, and elimination tests in a performance-aware CAS.

## Enabling Pattern

The relevant pattern is pragmatic conversion from user expressions into algebraic kernels while keeping calculator latency and embedded deployment in mind.

## Cost

Adopting Giac-style breadth directly would create pressure to match calculator-CAS feature breadth before Calcwiz has enough exact-domain policy.

## Calcwiz Translation Hint

Use Giac/XCAS as evidence that a calculator can have serious algebra kernels, but keep Calcwiz's first rational-integration slice smaller.

## Source

### SymEngine

- `playground/sources/mirrors/symengine/symengine/polys/uintpoly.*`
- `playground/sources/mirrors/symengine/symengine/polys/uratpoly.*`
- `playground/sources/mirrors/symengine/symengine/polys/uexprpoly.*`
- `playground/sources/mirrors/symengine/symengine/polys/cancel.h`
- `playground/sources/mirrors/symengine/symengine/rational.*`
- `playground/sources/mirrors/symengine/symengine/tests/polynomial/`

## Relevant Capability

SymEngine demonstrates a smaller fast symbolic-core approach: compact polynomial representations, rational numbers, and cancellation boundaries.

## Enabling Pattern

The useful pattern is a lean internal representation with clear ownership over polynomial and rational primitives.

## Cost

It is still a lower-level engine model, not a product-ready explanation/result surface model.

## Calcwiz Translation Hint

SymEngine supports Calcwiz's decision to keep polynomial/rational cores small, fast, and reusable before adding broad UX-facing behavior.

## Source

### GeoGebra

- `playground/sources/mirrors/geogebra/source/shared/common/src/main/javacc/org/geogebra/common/kernel/prover/polynomial/PolynomialParser.jj`
- `playground/sources/mirrors/geogebra/source/desktop/desktop/src/test/java/org/geogebra/common/kernel/cas/AlgoSolveTest.java`
- `playground/sources/mirrors/geogebra/source/shared/common-jre/src/testFixtures/java/org/geogebra/test/matcher/IsEqualPolynomialEquation.java`
- `playground/sources/mirrors/geogebra/source/desktop/desktop/src/main/java/org/geogebra/desktop/factories/CASFactoryD.java`

## Relevant Capability

GeoGebra is less important as a polynomial engine and more important as evidence for CAS-facing interaction, geometry/prover polynomial workflows, and user-facing math state.

## Enabling Pattern

The lesson is workflow integration: algebra output must remain inspectable and tied to user-visible mathematical objects.

## Cost

GeoGebra's UI and construction-state assumptions do not map directly to Calcwiz's workbench architecture.

## Calcwiz Translation Hint

Use GeoGebra as a reminder that rational-integration stops and successes need clean visible explanations, not just internal correctness.
