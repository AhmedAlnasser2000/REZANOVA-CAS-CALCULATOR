# EQUATION-SOURCE-MIRROR-CONTEXT-AUDIT0

Date: 2026-06-20

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- Static source-context audit only.
- Mirrors inspected as local research context under `playground/sources/`, following `playground/sources/SECURITY.md`.
- No mirror code was executed, built, installed, copied, or added as a dependency.
- No production code, caps, solver behavior, OOE behavior, Display behavior, History schema, app-state, Tauri, UI, Exact/Isolate semantics, graphing, step-by-step, Rust migration, or runtime authority changed.
- The purpose is context for Equation search/cap work, not imitation or parity pressure.

## Question

Calcwiz now has bounded selected-target search discipline, trace evidence, cap-hit evidence, and several current cap boundaries. The open question is how the source mirrors handle the same class of pressure:

- They appear to solve far more cases recursively.
- Calcwiz still has selected-target peeling, branch caps, degree caps, and structured stops.
- We need to know which mirror lessons are useful before extending the cap roadmap.

## Mirror Policy

Source mirrors are not Calcwiz authorities. They are context sources for patterns and risks.

- Stable `src/**` must not import or read source mirrors.
- Mirrors are untrusted and static-only unless a future milestone explicitly changes the tier.
- Source conclusions must be translated into Calcwiz-native seams, tests, and product wording.
- A mirror capability is not automatically a Calcwiz requirement.

## Cross-Mirror Finding

The strong systems do not get their power from an unbounded version of Calcwiz-style peeling. They get it from deeper algebraic infrastructure plus disciplined fallback:

- conversion/domain gates before treating expressions as polynomials;
- polynomial/rational normal forms and coefficient-domain policy;
- factorization, square-free facts, resultants, Groebner/elimination, and substitution over typed problem representations;
- assumptions, domains, exclusions, branches, and conditions carried through transformations;
- explicit symbolic/numeric separation;
- honest fallback objects, implicit equations, unevaluated forms, or error/stopping paths when a class is not implemented.

So the mirror lesson is not "raise peel depth." It is "build the right substrate before widening search."

## Mirror Matrix

| Mirror | What it shows for current Calcwiz issues | What Calcwiz should preserve | What Calcwiz should not copy |
| --- | --- | --- | --- |
| FriCAS | Broad exact power comes from typed algebraic domains, categories, polynomial packages, Groebner/elimination, and expression/domain conversions. | Domain-first thinking and capability boundaries. | Full category/domain runtime or an attempt to make every expression live in FriCAS-style algebraic towers. |
| SymPy | `solveset`/`nonlinsolve` route through domains, sets, `ConditionSet`, polynomial extraction, Groebner/substitution, and class-specific exp/log helpers. | Family identification before solving; unsolved objects/stops when algorithms are absent; tests around transformed equations. | A broad public API promise or hidden best-effort rewrite cascade in the product surface. |
| Maxima | Classic `solve` factors, canonicalizes to rational/polynomial forms, tracks roots/failures, applies degree-specific formulas, trig substitution, and `algsys` resultants/recursive substitution. | Solving as a cascade with explicit failures and polynomial structure. | Global mutable switches, opaque side-effect-driven solve state, or implicit broad transforms that Calcwiz cannot explain. |
| SageMath | Uses orchestration: symbolic expressions can route to Maxima, SymPy, Giac, assumptions, domains, and optional `to_poly_solve`. | Clear algorithm/backend boundaries and explicit domain/options vocabulary. | Multi-engine product identity or treating backend delegation as a shortcut for Calcwiz v1. |
| Giac/XCAS | Calculator-style CAS realism: solver commands sit beside normal forms, factor/resultant/Groebner utilities, exact/numeric options, and branch/performance tradeoffs. | Practical calculator UX pressure and performance realism. | Feature-parity pressure with handheld/full CAS systems before Calcwiz owns readback and correctness. |
| SymEngine | Fast symbolic core, set intersections for polynomial roots, explicit polynomial conversion helpers, degree-specific polynomial solvers. | Compact typed cores and conversion gates. | Assuming a fast expression core solves product readback, assumptions, branch semantics, or broad solving by itself. |
| GeoGebra | CAS-facing product workflow over Giac-backed symbolic commands, Solve/NSolve toggling, undefined/empty handling, and suggestion surfaces. | Product honesty: distinguish exact/numeric, show available actions only when appropriate, keep undefined states visible. | Graph-first or service/UI identity, or hiding solver complexity behind a broad command surface too early. |

## Source Anchors Inspected

- `playground/sources/INDEX.md`
- `playground/sources/SECURITY.md`
- `playground/area-studies/studies/area-poly-rat1/02-cross-source-comparison.md`
- `playground/area-studies/studies/area-poly-elim0/02-cross-source-comparison.md`
- `playground/area-studies/studies/area-assumptions0/02-cross-source-comparison.md`
- `playground/area-studies/studies/area-simplify0/02-cross-source-comparison.md`
- `playground/sources/mirrors/sympy/sympy/solvers/solveset.py`
- `playground/sources/mirrors/sympy/sympy/solvers/polysys.py`
- `playground/sources/mirrors/maxima/src/solve.lisp`
- `playground/sources/mirrors/maxima/src/algsys.lisp`
- `playground/sources/mirrors/sagemath/src/sage/symbolic/relation.py`
- `playground/sources/mirrors/sagemath/src/sage/symbolic/expression.pyx`
- `playground/sources/mirrors/symengine/symengine/solve.cpp`
- `playground/sources/mirrors/symengine/symengine/polys/basic_conversions.h`
- `playground/sources/mirrors/geogebra/source/shared/common/src/main/java/org/geogebra/common/util/SymbolicUtil.java`
- `playground/sources/mirrors/geogebra/source/shared/common/src/main/java/org/geogebra/common/gui/view/algebra/SuggestionSolveForSymbolic.java`

## Compared To Calcwiz / Classwiz

Calcwiz is not trying to be a hidden full CAS with a calculator skin. Its stronger product target is a Classwiz-like desktop workbench posture:

- visible guided modes;
- explicit solve actions;
- exact results only when the app can defend them;
- clear stops when a family is outside current support;
- readable display/readback over opaque engine dumps;
- future numeric behavior labeled as numeric, not exact;
- future graphing downstream of validated domains, branches, and restrictions.

This makes Calcwiz intentionally different from the mature mirrors:

- FriCAS/Sage favor broad mathematical infrastructure.
- SymPy/Maxima favor broad practical symbolic APIs.
- Giac/XCAS/GeoGebra favor calculator/CAS command breadth.
- SymEngine favors lean core performance.
- Calcwiz should favor bounded trust, inspectable search, and product-specific readback.

The current Calcwiz search-discipline foundation is therefore the right direction. It gives us target-shape profiling, route planning, trace evidence, generated-handoff seams, symbolic coefficient handling, and cap-hit evidence. But it is still not mature CAS recursion, and it should not pretend to be.

## Implications For Current Caps

Source mirrors support the `EQUATION-CAP-HIT-EVIDENCE1` classification:

- Selected-target peel depth is a tactic, not a main solver architecture. It can be recalibrated only with real default-cap hits and trace evidence.
- Generated branch counts are possible recalibration candidates only when branch readback and semantic facts remain readable.
- Symbolic degree-2 polynomial/rational caps are algorithm boundaries until Calcwiz adds higher-degree algorithms, factoring, or implicit-root forms.
- Algebraic/factorable degree caps are algorithm/readback boundaries, not simple knobs.
- Formula-size stops are readback safety boundaries.
- Composition depth and periodic-parameter caps are semantic boundaries because mature systems carry branch/domain/set facts that Calcwiz does not yet own.

## Recommended Next Roadmap Shape

Do not create a "copy the giants" roadmap. Extend the existing Equation roadmap with a source-context gate:

1. Finish preserving this audit as `EQUATION-SOURCE-MIRROR-CONTEXT-AUDIT0`.
2. Continue with `EQUATION-CAP-HIT-REAL-CASES0` before raising any cap.
3. For implementation, split by substrate instead of by bigger search:
   - factoring and explicit product decomposition;
   - higher-degree polynomial/root representation policy;
   - assumptions/domain/exclusion facts;
   - branch-family readback and compactness policy;
   - exact-vs-isolate answer semantics.
4. Keep peeling bounded as an isolation tactic, not the route to CAS power.

## Bottom Line

The mirrors validate the discipline we just built, but they also warn against mistaking discipline for capability. Calcwiz is now better positioned to grow safely, not suddenly comparable to FriCAS/Sage/Giac/Maxima in recursive solving breadth.

