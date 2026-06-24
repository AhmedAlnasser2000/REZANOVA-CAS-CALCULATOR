# ANSWER-PRESENTATION-SOURCE-MIRROR-AUDIT0

Date: 2026-06-24
Repo: `/home/ahmed/Downloads/Calculator`
Status: complete
Gate type: architecture audit

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Question

The user reported that the exact-answer readability issue still appears after `ANSWER-READBACK-MATHJSON-BRANCHES1`, especially for nested radical branches in the complex carrier follow-on route. The requested audit is not another local fix. It asks how the local source mirrors present answers after solving, then compares that post-processing stage with Calcwiz.

The core question:

- Do mature systems let solver routes directly emit final display strings?
- Or do they route final answers through a shared expression-aware presentation stage before rendering?

## Short Finding

The source mirrors overwhelmingly use expression-aware presentation stages. They may expose many output formats, but they do not treat solver-produced LaTeX strings as the main answer object. Instead, answers remain typed expression trees or presentation objects until a central printer/formatter walks the tree and handles precedence, signs, radicals, fractions, complex forms, and output-format policy.

Calcwiz has most of the raw ingredients: MathJSON nodes, private Symbolic Primitives, root representation, branch facts, finite branch readback helpers, and safe LaTeX final polish. The gap is routing and ownership. `DisplayOutcome.exactLatex`, `exactLatexOverride`, `branchReadback`, and route-owned branch strings still let solver routes bypass the structure-first path. That is why recurring answer-readback bugs keep returning after each solver upgrade.

## Source Mirror Evidence

### SymPy

Evidence:

- `playground/sources/mirrors/sympy/sympy/printing/printer.py`
- `playground/sources/mirrors/sympy/sympy/printing/latex.py`

SymPy uses a `Printer` dispatcher. `doprint(expr)` calls `_print(expr)`, and `_print` dispatches recursively by object print method or printer method. The LaTeX printer handles `Add`, `Mul`, and `Pow` as structured nodes. `_print_Add` orders terms and decides whether to emit ` + ` or ` - ` from each term's sign instead of trusting a prebuilt string. `_print_Pow` and related methods print radicals/powers recursively from child expressions.

Lesson for Calcwiz: signs and nested radicals should be handled while walking expression structure, not by isolated string cleanup after a solver builds a full answer.

### Maxima

Evidence:

- `playground/sources/mirrors/maxima/src/displa.lisp`
- `playground/sources/mirrors/maxima/src/mactex.lisp`

Maxima's display code routes expressions through `dimension` and operator-specific display methods before output. Its TeX path calls `tex` on expression structure, dispatches through operator `tex` properties, and recursively renders children. `tex-sqrt` renders the square-root argument by calling the TeX renderer on the nested expression, and `tex-mplus` handles addition signs centrally.

Lesson for Calcwiz: radical contents should be presentation-stage children. If a radicand still contains sign noise, the pipeline should recurse into that child rather than keep adding top-level regexes.

### FriCAS

Evidence:

- `playground/sources/mirrors/fricas/src/algebra/fmtlatex.spad`
- `playground/sources/mirrors/fricas/src/algebra/outform2.spad`

FriCAS routes typed math values into `OutputForm`, then `FormatLaTeX` turns `OutputForm` into LaTeX-oriented output boxes. The formatter analyzes presentation primitives and recurses through child expressions such as root arguments and compound operators.

Lesson for Calcwiz: a typed presentation form between solver result and LaTeX is a stable architecture boundary. It is not the same thing as Display becoming a CAS.

### Giac/Xcas

Evidence:

- `playground/sources/mirrors/giac-xcas/src/giac/cpp/tex.cc`

Giac's `gen2tex` dispatches on the `gen` expression type and recurses into subexpressions. Fractions call `gen2tex` on numerator and denominator. Square-root formatting for exponent `1/2` emits `\\sqrt{...}` with the radicand rendered from the child expression.

Lesson for Calcwiz: output notation is a recursive printer over a math object. A route should not have to pre-decide every nested formatting rule.

### SymEngine

Evidence:

- `playground/sources/mirrors/symengine/symengine/printers/latex.h`
- `playground/sources/mirrors/symengine/symengine/printers/latex.cpp`

SymEngine uses a visitor-style `LatexPrinter`. It has `bvisit` methods for symbols, rationals, complex numbers, sets, equality, functions, absolute values, powers, multiplication, and division. Complex sign handling, rational formatting, finite sets, and square-root rendering live in the centralized printer.

Lesson for Calcwiz: complex notation and finite set presentation should be governed by one presentation path, not manually replicated by each route.

### SageMath

Evidence:

- `playground/sources/mirrors/sagemath/src/sage/repl/rich_output/display_manager.py`
- `playground/sources/mirrors/sagemath/src/sage/misc/latex.py`

Sage's display manager asks objects for rich representations and validates/promotes them into backend output containers. LaTeX support is object/domain-owned through `_latex_` methods. The solver result remains an object with display hooks rather than a final string owned by the solver route.

Lesson for Calcwiz: backend display should receive a selected presentation, not infer math from arbitrary route strings.

### GeoGebra

Evidence:

- `playground/sources/mirrors/geogebra/source/shared/common/src/main/java/org/geogebra/common/kernel/StringTemplate.java`
- `playground/sources/mirrors/geogebra/source/shared/common/src/main/java/org/geogebra/common/kernel/arithmetic/ExpressionNode.java`
- `playground/sources/mirrors/geogebra/source/shared/common/src/main/java/org/geogebra/common/kernel/geos/GeoElement.java`
- `playground/sources/mirrors/geogebra/source/shared/common/src/main/java/org/geogebra/common/kernel/geos/GeoCasCell.java`

GeoGebra uses `StringTemplate` as an output-policy object with dedicated templates for default, algebra, LaTeX, CAS, XML, numeric, editor, screen reader, and other contexts. `ExpressionNode` and `GeoElement` render through `toString`, `toValueString`, `toOutputValueString`, and `toLaTeXString` using the template context. CAS cells choose LaTeX templates and render expression values through those template-aware methods.

Lesson for Calcwiz: output policy is explicit input to rendering. Calcwiz's `complexExactForm`, output style, domain intent, and solve target should flow into a single answer-presentation stage.

## Calcwiz Current Reality

Calcwiz already has a partial version of the mirror architecture:

- MathJSON is the internal expression tree used by Symbolic Primitives.
- `src/lib/symbolic-engine/primitives/simplification/` can recursively simplify MathJSON nodes.
- `src/lib/equation/roots/representation.ts` has `EquationExactFiniteRoot.node`.
- `src/lib/equation/readback/mathjson-branches.ts` can prefer node-backed finite branch expressions.
- `src/lib/equation/readback/normalization.ts` provides final safe LaTeX polish.
- `src/lib/equation/readback/exact-overrides.ts` can safely decompose simple finite root overrides.

But Calcwiz still has strong escape hatches:

- `DisplayOutcome.exactLatex` is a raw LaTeX payload.
- `EquationRootSet.exactLatexOverride` can remain a final visual answer string.
- `branchReadback` and route-owned exact branches can be built from strings.
- Some producers preserve MathJSON nodes; others still emit only LaTeX.
- Display still contains compatibility extraction and rendering paths for already-stringified branch data.

This is why the same class of issue repeats. The readback normalizer and MathJSON branch helpers are helpful, but they are optional consumers instead of a mandatory producer-to-display pipeline.

## Diagnosis Of The Current Screenshot Class

The remaining nested-radicand issue is not proof that MathJSON or the simplification primitive is wrong. It is proof that Calcwiz still permits final answer paths where:

1. a route assembles a visible exact branch as LaTeX;
2. normalization sees only the top-level branch string or a rendered node result;
3. nested presentation concerns such as signs inside radicals have already become text;
4. Display renders that text faithfully.

Mature systems avoid this by keeping the nested radicand as an expression child until the printer has walked it. The right fix is therefore not to keep teaching the LaTeX regex layer more algebra. The right fix is to make exact answer presentation structure-first by default and LaTeX-string fallback a compatibility lane.

## Recommended Next Architecture

Create a dedicated answer presentation pipeline milestone before more readback patching:

`ANSWER-PRESENTATION-PIPELINE-ROADMAP0`

Then implement the first code milestone:

`ANSWER-PRESENTATION-IR1`

The proposed internal shape should be Equation-owned first, not Display-owned:

- `EquationAnswerPresentation`
- finite root items with `{ target, node, fallbackLatex, source }`
- finite set items
- periodic/generalized family items
- fact references or fact-group ids
- approximation items
- source/detail references
- explicit presentation context: output style, `complexExactForm`, domain intent, solve target, variable roles, reserved identifiers

The render order should become:

1. solver produces structured answer presentation items;
2. expression items keep MathJSON nodes when available;
3. Symbolic Simplification primitive normalizes the MathJSON node recursively;
4. a shared Equation presentation renderer turns the node/item into LaTeX;
5. the existing LaTeX normalizer performs final local polish only;
6. Display renders the already-presented result without becoming a CAS.

First migration candidates:

1. complex/polynomial carrier follow-on branches;
2. parameterized quadratic/polynomial finite branches;
3. algebraic isolation finite branches;
4. complex special-form branches;
5. exact-rational factorable root sets.

## Guardrails

- Do not move MathJSON ASTs to Rust. The current TypeScript MathJSON tree and Symbolic Primitives already provide recursive traversal.
- Do not pass MathJSON or expression trees over Tauri IPC.
- Do not make Display parse and simplify arbitrary math.
- Do not parse `detailSections` or prose as facts.
- Do not change solver capability, route order, OOE behavior, History schema, app-state, Tauri persistence, or Calculate algebra actions in the audit.
- Do not replace all existing strings in one sweep. Migrate producer families behind focused parity tests.

## Decision

The durable direction is: Calcwiz should converge on a mandatory producer-side answer presentation pipeline over MathJSON/presentation items. LaTeX string normalization remains a final polish and compatibility fallback, not the core answer-postprocessing strategy.

## Verification

- `npm run test:memory-protocol`
- `git diff --check`
