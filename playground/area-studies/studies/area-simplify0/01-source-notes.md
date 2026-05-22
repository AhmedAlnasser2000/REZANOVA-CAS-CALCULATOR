# AREA-SIMPLIFY0 Source Notes

These notes are static-source observations only. Paths are evidence pointers; no implementation code is copied or executed.

## Source

### Calcwiz

- `src/lib/engine/math-engine.ts`
- `src/lib/symbolic-engine/rational.ts`
- `src/lib/symbolic-engine/power-log.ts`
- `src/lib/algebra/rational-function-core.ts`
- `src/lib/algebra/radical-core.ts`
- `src/lib/algebra/abs-core.ts`
- `src/lib/trigonometry/identities.ts`
- `src/lib/display/symbolic-display.ts`
- `src/lib/display/math-notation.ts`

## Relevant Capability

Calcwiz already has shipped simplify, factor, expand, rational cancellation, power-log normalization, radical/absolute-value helpers, bounded trig identity simplification, and display readback. These are useful but distributed.

## Enabling Pattern

The strongest local pattern is bounded owner-specific transforms with tests and stop behavior. The weakest point is that equivalence/readback policy is not yet a shared substrate.

## Cost

A shared policy can easily become a broad simplifier if it tries to own algorithms rather than decisions about form, assumptions, and display.

## Calcwiz Translation Hint

Build a small `SIMPLIFY-CORE0` policy layer that records form intent, equivalent-form trust, and preserved constraints without adding new rewrite power.

## Source

### FriCAS

- `playground/sources/mirrors/fricas/src/algebra/expr.spad`
- `playground/sources/mirrors/fricas/src/algebra/efstruc.spad`
- `playground/sources/mirrors/fricas/src/algebra/manip.spad`
- `playground/sources/mirrors/fricas/src/algebra/fraction.spad`
- `playground/sources/mirrors/fricas/src/algebra/trigcat.spad`

## Relevant Capability

FriCAS treats expression manipulation in the context of algebraic domains and expression structure. Simplification is powerful because expression forms interact with typed algebraic structures.

## Enabling Pattern

Domain-aware expression structure, not blind string rewriting.

## Cost

The domain/category system is too heavy for Calcwiz to inherit.

## Calcwiz Translation Hint

Borrow the discipline of form ownership and domain context, not the architecture.

## Source

### SymPy

- `playground/sources/mirrors/sympy/sympy/simplify/simplify.py`
- `playground/sources/mirrors/sympy/sympy/simplify/ratsimp.py`
- `playground/sources/mirrors/sympy/sympy/simplify/trigsimp.py`
- `playground/sources/mirrors/sympy/sympy/simplify/radsimp.py`
- `playground/sources/mirrors/sympy/sympy/simplify/powsimp.py`
- `playground/sources/mirrors/sympy/sympy/simplify/tests/`

## Relevant Capability

SymPy shows that practical simplification is a family of targeted tools, not one universal operation. Rational, trig, radical, power, and common-subexpression tools are separated.

## Enabling Pattern

Multiple form-specific simplifiers plus extensive test families.

## Cost

Broad public APIs create expectation pressure and require assumption handling that Calcwiz does not yet have.

## Calcwiz Translation Hint

Keep Calcwiz policy explicit: choose form families and stop reasons before adding rewrite breadth.

## Source

### Maxima

- `playground/sources/mirrors/maxima/src/simp.lisp`
- `playground/sources/mirrors/maxima/src/simp-utils.lisp`
- `playground/sources/mirrors/maxima/src/comm.lisp`
- `playground/sources/mirrors/maxima/src/comm2.lisp`
- `playground/sources/mirrors/maxima/src/trigi.lisp`
- `playground/sources/mirrors/maxima/src/rat3a.lisp`
- `playground/sources/mirrors/maxima/share/simplification/`
- `playground/sources/mirrors/maxima/doc/info/simplifications.texi`

## Relevant Capability

Maxima demonstrates mature classic CAS simplification with rational, trigonometric, and optional package layers.

## Enabling Pattern

Long-lived transform families plus user-visible knobs and regression examples.

## Cost

Global switches and broad implicit transforms would be product-hostile for Calcwiz's bounded honesty.

## Calcwiz Translation Hint

Use examples and risk lessons, not global simplification semantics.

## Source

### SageMath

- `playground/sources/mirrors/sagemath/src/sage/symbolic/expression.pyx`
- `playground/sources/mirrors/sagemath/src/sage/symbolic/expression_conversions.py`
- `playground/sources/mirrors/sagemath/src/sage/symbolic/ginac/normal.cpp`
- `playground/sources/mirrors/sagemath/src/sage/symbolic/assumptions.py`
- `playground/sources/mirrors/sagemath/src/sage/symbolic/relation.py`

## Relevant Capability

SageMath shows simplification as platform orchestration over symbolic expressions, assumptions, conversion layers, and external engines.

## Enabling Pattern

Orchestrated symbolic rings and assumptions rather than a single local helper.

## Cost

Platform-scale delegation is not a near-term Calcwiz strategy.

## Calcwiz Translation Hint

Keep future backend/profile ideas separate from the local simplification policy.

## Source

### Giac/XCAS

- `playground/sources/mirrors/giac-xcas/src/giac/headers/gen.h`
- `playground/sources/mirrors/giac-xcas/src/giac/headers/symbolic.h`
- `playground/sources/mirrors/giac-xcas/src/giac/headers/usual.h`
- `playground/sources/mirrors/giac-xcas/src/giac/headers/sym2poly.h`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/symbolic.cc`
- `playground/sources/mirrors/giac-xcas/src/giac/cpp/maple.cc`

## Relevant Capability

Giac/XCAS is strong calculator-engine evidence: simplification must support practical calculator workflows while staying fast and compact.

## Enabling Pattern

Tight symbolic representation, polynomial conversion, and command-oriented behavior.

## Cost

Calculator CAS breadth can create feature-parity pressure.

## Calcwiz Translation Hint

Study workflow realism and command surfaces, not feature breadth.

## Source

### SymEngine

- `playground/sources/mirrors/symengine/symengine/simplify.cpp`
- `playground/sources/mirrors/symengine/symengine/simplify.h`
- `playground/sources/mirrors/symengine/symengine/expand.cpp`
- `playground/sources/mirrors/symengine/symengine/rewrite.cpp`
- `playground/sources/mirrors/symengine/symengine/tests/basic/test_simplify.cpp`
- `playground/sources/mirrors/symengine/symengine/tests/basic/test_as_numer_denom.cpp`

## Relevant Capability

SymEngine shows the value of a compact core with predictable structural simplification and denominator/numerator facts.

## Enabling Pattern

Lean expression core plus explicit operations.

## Cost

Fast core behavior alone does not solve user-facing assumption, domain, and readback honesty.

## Calcwiz Translation Hint

Use it as evidence for a small internal policy, not a core rewrite.

## Source

### GeoGebra

- `playground/sources/mirrors/geogebra/source/shared/giac-jni/build.gradle.kts`
- `playground/sources/mirrors/geogebra/source/shared/common/`
- `playground/sources/mirrors/geogebra/source/shared/common-jre/`
- `playground/sources/mirrors/geogebra/source/web/`

## Relevant Capability

GeoGebra is mainly workflow evidence here: CAS commands, geometry interaction, and user-facing math surfaces need predictable readable output.

## Enabling Pattern

CAS output is embedded in product workflow, not exposed as raw engine internals.

## Cost

GeoGebra's UI/product assumptions and mixed licensing are not Calcwiz architecture.

## Calcwiz Translation Hint

Carry forward the workflow lesson: users need visible form intent and honest stops.
