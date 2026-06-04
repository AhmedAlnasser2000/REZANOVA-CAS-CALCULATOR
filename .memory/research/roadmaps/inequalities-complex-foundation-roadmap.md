# Inequalities And Complex Foundation Roadmap

## Purpose

This roadmap owns the solver-foundation pause after `OOE-RS25`.

The goal is to establish inequality and complex-number semantics before resuming deeper OOE Equation cancellation and isolation work. OOE remains Calcwiz's traffic controller, but the solver universe it controls is about to widen. Inequalities and complex support will affect:

- what counts as a solution;
- whether an answer is real-only, complex-allowed, or conditionally real;
- how `Valid when` facts are produced and trusted;
- how Exact, Approximate, and Isolate answer modes communicate intent;
- how diagnostics and provenance explain stop reasons and route choices;
- how future cancellation checkpoints describe partial progress safely.

## Recommendation

Work on inequalities and complex foundations together, but not as two independent edits.

The safe approach is simultaneous planning plus shared substrate first:

- define one domain/value/fact contract;
- make complex answer behavior opt-in through a visible top-header `Complex` domain toggle before product adoption;
- make real-vs-complex answer intent explicit;
- keep inequality facts and complex-domain facts in the same assumption/readback vocabulary;
- reuse existing branch/domain/assumptions cores where relevant instead of duplicating branch facts, domain exclusions, range/principal facts, or validity readback;
- keep first product adoption focused on Equation until the new semantics stabilize;
- then let bounded inequality support and bounded complex support progress in parallel rails.

This avoids two bad outcomes:

- the inequality lane saying "no real solution" while the complex lane later treats the same family as solved;
- the complex lane returning non-real answers while the inequality/domain lane still assumes every restriction is real-only.

## Boundaries

- This roadmap is not OOE work.
- This roadmap does not implement Progressive Solver.
- This roadmap does not reopen Atomic or multi-host execution.
- No broad CAS inequality solver is approved by this document.
- No contour integration, branch-cut theorem prover, graphing behavior, or global `assume(...)` feature is approved here.
- Stored values remain finite real numeric values unless a later explicit milestone changes that policy.
- Exact-mode complex answers must be visibly marked as complex-domain behavior before product adoption.
- Complex-domain answers must stay opt-in; ordinary real-first workflows should not suddenly surface complex roots because a bounded complex route exists.
- Approximate mode remains real numeric interval solving until a milestone explicitly adds complex numerical search.
- Product-facing inequality and complex routes are Equation-first until stabilized. Shared cores may be reusable by design, but visible adoption in Calculate, Table, Calculus, Advanced Calc, Trigonometry, Geometry, Statistics, Matrix, and Vector is deferred.

## Shared Concepts To Lock First

### Answer Domain

Introduce a stable internal vocabulary for answer domain:

- `real`: all returned solutions are intended as real values.
- `complex`: returned solutions may include non-real complex values.
- `conditional-real`: expression is symbolic and realness depends on visible conditions.
- `unknown-domain`: route cannot prove a trustworthy domain.

The visible UI does not need to expose these exact labels immediately, but result/provenance/details should have one internal source of truth.

### Complex Domain Toggle

Product-facing complex support should be gated by a top-header `Complex`/complex-domain toggle, similar in spirit to existing header controls such as angle unit and exact mode.

Expected behavior:

- disabled by default for ordinary real-first calculator use;
- when disabled, bounded real routes keep their current real-domain behavior and may say no real solution where that is true over the reals;
- when enabled, bounded complex-capable routes may return complex-domain answers, with visible result-card notes or chips so complex output does not masquerade as real output;
- stored values remain finite real numeric values until a separate variable milestone explicitly changes that policy;
- the toggle is answer-domain intent, not a new solver family by itself.

### Solution Kind

Keep solution style separate from answer domain:

- exact symbolic answer;
- approximate numeric answer;
- isolate/rearranged formula;
- inequality solution set;
- condition/fact-only stop.

This keeps `Exact`, `Approximate`, and `Isolate` answer modes from absorbing inequality/complex behavior accidentally.

### Fact Vocabulary

Use the existing assumptions/facts spine where possible. New fact families should be scoped and source-tagged:

- domain exclusion, such as denominator not zero;
- real-domain requirement, such as radicand nonnegative;
- inequality interval, such as `x <= 2`;
- branch/principal-value fact;
- complex-domain note;
- candidate rejection fact.

Existing branch/domain cores remain important inputs:

- branch-core style metadata should continue to own branch/case bookkeeping where applicable;
- domain/range and assumptions cores should own reusable exclusions, real-domain requirements, principal/range facts, interval hazards, and equivalence-trust facts;
- inequality and complex milestones should extend these shared cores when they need new vocabulary, not create route-local fact dialects that cannot be reused by Equation, Calculate, Table, Calculus, Geometry, Statistics, or OOE diagnostics.

### Readback And History

Before product adoption, decide how old history entries replay when domain mode changes:

- replay through current solver contract when possible;
- preserve old visible math if replay is impossible;
- avoid history schema churn unless an adoption milestone proves it is necessary.

## Milestones

### `INEQ-COMPLEX-FOUNDATION0` - Audit And Contract Freeze

Type: audit/readiness.

Status: completed on 2026-06-02. See `.memory/research/architecture/ineq-complex-foundation0-domain-audit.md`.

Goal:

- audit current real-only assumptions, complex guards, inequality-adjacent code, and selected-target/domain readback.

Expected scope:

- list current places that reject or hide complex output;
- list current places that emit inequality-like facts;
- document how Equation, Calculate, Table, Calculus, Advanced Calc, Geometry, Statistics, and Linear Algebra currently assume real values;
- define the initial answer-domain and solution-kind vocabulary;
- identify tests that must not regress.

No runtime behavior changes.

Completion notes:

- froze answer domains as `real`, `complex`, `conditional-real`, and `unknown-domain`;
- froze solution kind separately from answer domain;
- recorded the future opt-in top-header `Complex` toggle contract;
- kept product-facing adoption Equation-first until stable;
- audited current reusable substrate ownership across `assumptions-core`, `branch-core`, `domain-range-core`, `numeric/complex`, `SolveDomainConstraint`, `DisplayOutcome`, Equation answer modes, and OOE provenance.

### `VALUE-DOMAIN-CORE1` - Shared Domain And Value Contract

Type: implementation substrate.

Status: implemented on 2026-06-02.

Goal:

- add the internal domain/value/fact substrate that both inequality and complex rails consume.

Expected scope:

- typed answer-domain metadata;
- typed solution-kind metadata where needed;
- scoped fact constructors for inequality/domain/complex facts;
- readback helpers for simple facts;
- no public setting yet unless required by tests.

Boundary:

- no broad inequality solving;
- no complex solver adoption;
- no stored complex variables;
- no OOE changes except future-proofing diagnostics fields if already internal.

Completion notes:

- added `src/lib/algebra/value-domain-core.ts`;
- locked `AnswerDomain` and `SolutionKind` as internal TypeScript vocabularies;
- added value-domain metadata builders with deduped assumption facts and summaries;
- extended the existing assumption fact spine with `inequality-constraint` and `complex-domain-note`;
- added `value-domain-core`, `inequality-core`, and `complex-core` assumption sources;
- added simple readback grouping for inequality facts and complex-domain notes;
- kept the milestone pure-core with no UI, solver, history, app-state, OOE, Rust, or Tauri schema behavior change.

### `COMPLEX-CORE1` - Complex Number Primitive And Readback

Type: bounded implementation.

Status: implemented on 2026-06-02.

Goal:

- establish a trustworthy internal complex-number primitive and display/readback contract.

Expected scope:

- complex scalar representation;
- no user-input or LaTeX complex parser yet;
- exact/numeric formatting helpers;
- arithmetic smoke tests for addition, multiplication, powers, roots, branch lists, and conjugates;
- strict separation from current real-only stored-value policy.

Boundary:

- no broad Equation complex solving yet;
- no complex parser adoption;
- no contour calculus;
- no automatic complex Approximate mode;
- no graphing.

Completion notes:

- extended `src/lib/numeric/complex.ts` as the reusable complex primitive;
- added conjugate, argument, polar construction, integer powers, principal nth roots, and deterministic all nth roots;
- added branch/readback helpers for principal-root and all-branches cases;
- connected branch readback to `VALUE-DOMAIN-CORE1` only through tests and `complex-core` facts;
- preserved pure-core boundaries with no UI toggle, Equation adoption, stored complex variables, parser, OOE, history, or result schema changes.

### `INEQUALITY-CORE1` - Bounded Inequality Fact And Interval Core

Type: bounded implementation.

Status: implemented on 2026-06-02.

Goal:

- establish an internal inequality/interval representation for real-domain facts and future inequality solving.

Expected scope:

- typed constructors for simple comparisons;
- represent open/closed intervals and finite unions;
- combine simple one-variable facts;
- read back simple interval facts;
- support existing `Valid when` style facts without changing solver capabilities.

Boundary:

- no broad nonlinear inequality solver;
- no user-input, LaTeX, or MathJSON inequality parser;
- no piecewise engine;
- no graphing;
- no public assumptions UI.

Completion notes:

- added `src/lib/algebra/inequality-core.ts`;
- added typed `InequalityInterval` and `InequalitySet` shapes for finite unions of one-variable real intervals;
- added constructors for all-real, empty, point, open/closed intervals, less-than, less-than-or-equal, greater-than, and greater-than-or-equal shapes;
- added deterministic normalization, intersection, containment, empty-set detection, stable equality, and text/LaTeX readback helpers;
- connected inequality sets to `VALUE-DOMAIN-CORE1` through `inequality-core` assumption facts and `solutionKind: inequality-solution-set`;
- preserved pure-core boundaries with no parser, visible Equation route, broad solver, UI, history, app-state, OOE, Rust, or Tauri schema changes.

### `EQUATION-DOMAIN-INTENT1` - Equation Complex Intent Toggle

Type: product-facing intent metadata, before complex solving.

Status: implemented on 2026-06-02.

Goal:

- add the persisted user intent that later bounded complex Equation routes will require.

Expected scope:

- top-header `Complex Off` / `Complex On` quick toggle;
- `settings.equationDomainIntent` with `real` default and desktop/web persistence;
- Equation symbolic request threading;
- Equation OOE input-revision and provenance threading;
- history replay of saved Equation domain intent;
- visible result-card note only when Complex is enabled.

Boundary:

- no complex solving;
- no inequality solving;
- no complex parser;
- no stored complex variables;
- no Approximate complex search;
- no visible complex adoption outside Equation;
- no solver behavior, result semantics, or OOE runtime behavior change.

Completion notes:

- added persisted `equationDomainIntent: real | complex` to settings and sanitization/defaulting;
- added a global header `Complex Off` / `Complex On` quick toggle;
- threaded intent through Equation symbolic requests, active request refs, OOE snapshots/input revisions, history entries/replay, and rich Equation OOE provenance;
- displayed `Domain intent: Complex` only on Equation symbolic results when Complex is enabled;
- kept all solvers real-first and left bounded complex answers to `COMPLEX-EQUATION1`.

### `COMPLEX-EQUATION1` - Bounded Complex Equation Adoption

Type: product-facing, after `COMPLEX-CORE1`, `VALUE-DOMAIN-CORE1`, and `EQUATION-DOMAIN-INTENT1`.

Goal:

- allow bounded exact complex results where the route is safe and clearly marked.

Possible first targets:

- polynomial roots where current real solver says no real roots;
- simple powers/roots with explicit complex-domain answer intent;
- existing bounded polynomial helpers that already have numeric/symbolic structure.

Boundary:

- no general transcendental complex solving;
- no complex Approximate search;
- no stored complex variables unless a separate variable milestone approves it.
- no visible complex adoption outside Equation.

Completion notes:

- optional answer-domain metadata is now available on Equation outcomes/history and OOE provenance;
- `Complex On` plus answer mode `Exact` can return bounded complex-domain branches for negative-discriminant quadratics and simple selected-target powers;
- `Complex Off` stays real-first, `Approximate` stays real interval-only, and `Isolate` stays rearrangement-only;
- no complex parser, stored complex values, inequality solving, non-Equation complex adoption, broad transcendental complex solving, OOE runtime behavior change, or Rust solver execution was added.

### `INEQUALITY-EQUATION1` - First Product Inequality Route

Type: product-facing, after `INEQUALITY-CORE1` and `VALUE-DOMAIN-CORE1`.

Status: implemented on 2026-06-03.

Goal:

- add a bounded inequality-solving route without pretending to be a general CAS inequality engine.

Implemented first targets:

- top-level `<`, `<=`, `>`, and `>=` relations only;
- one-variable numeric-coefficient linear inequalities reducible to `a*x+b relation 0`;
- constant true/false linear reductions that return all-real or empty-set results.

Boundary:

- no multivariable inequalities;
- no symbolic-parameter inequalities;
- no quadratic, rational sign-chart, absolute-value, trig/log/exp, or chained inequalities;
- no `!=` inequality route;
- no nested absolute-value inequalities unless separately scoped;
- no trig/log/exponential inequality families in the first product route.
- no visible inequality adoption outside Equation.
- no Approximate inequality sampling and no Isolate inequality rearrangement.

Completion notes:

- added a bounded Equation inequality helper over the existing Compute Engine relation parse and `polynomial-core` linear exact parsing;
- routed Equation symbolic `Exact` top-level ordered inequalities before the legacy non-equality stop;
- returned interval/set LaTeX through `INEQUALITY-CORE1` with `answerDomain: conditional-real` and `solutionKind: inequality-solution-set`;
- threaded optional `solutionKind` through `DisplayOutcome`, history entries/replay, app-state schema, Rust persisted history shape, result-card chip readback, diagnostics summaries, and rich Equation OOE provenance;
- kept `Approximate` and `Isolate` on controlled guidance for inequality inputs;
- kept `Complex On` real-order-only for inequalities with a visible detail note;
- preserved all non-Equation routes and broad inequality families as deferred.

### `ANSWER-DOMAIN-READBACK1` - Result And History Polish

Type: integration polish.

Status: implemented on 2026-06-03.

Goal:

- make real/complex/inequality outcomes understandable and replay-safe.

Expected scope:

- result-card notes for answer domain when needed;
- consistent `Valid when` and inequality-set display;
- history replay safety for domain-aware results;
- copy/editor behavior for complex and inequality outputs.

Boundary:

- no new solver family beyond already implemented bounded routes.

Completion notes:

- fixed the persisted-history bootstrap layout so large restored history lists render as stable, non-shrinking compact cards;
- collapsed history cards now show only the original input preview plus mode/replay/delete/expand controls;
- expanded history cards reveal answer, approximation, domain/solution labels, and validity facts in contained scroll areas without taking over the whole panel;
- consolidated Equation result chips so actual complex results show `Domain: Complex` while suppressing duplicate `Domain intent: Complex`;
- preserved `Domain intent: Complex` plus `Solution: Inequality set` for ordered inequalities because inequality math remains real-order-only;
- fixed prose/detail readback for ASCII comparison operators such as `<=`, `>=`, and `!=`;
- normalized simple bounded complex power branches into cleaner branch readback where safe;
- kept the milestone readback/layout-only with no new solver family, parser, stored-value policy, OOE behavior, history schema change, or non-Equation adoption.

### Next Sequencing Clarification

The next larger leap should preserve a shared-substrate-first shape without inventing a vague combined milestone.

Keep `POLYNOMIAL-DOMAIN-CORE1` as the candidate shared substrate if the next work needs common polynomial/rational structure:

- classify one-variable polynomial/rational shapes;
- expose degree, coefficients, simple factors, target variable, and domain exclusions;
- produce reusable branch/domain/fact metadata for Equation consumers;
- avoid solving, UI changes, history changes, OOE behavior changes, and broad parser adoption.

Do not lock in `EQUATION-ADVANCED-DOMAIN1` for now. It bundles too many concerns and would blur product-facing inequality and complex expansion.

Preferred post-substrate rails:

- `INEQUALITY-EQUATION2`: use the shared substrate for bounded quadratic and factored real inequality solution sets.
- `COMPLEX-EQUATION2`: use the shared substrate for broader bounded polynomial/power complex answers.

### `POLYNOMIAL-DOMAIN-CORE1` - Shared Polynomial/Rational Domain Classifier

Type: pure core substrate.

Status: implemented on 2026-06-03.

Goal:

- provide one shared classifier for polynomial/rational structure before the next inequality and complex Equation rails.

Completion notes:

- added `src/lib/algebra/polynomial-domain-core.ts` as a thin classifier over existing exact polynomial and rational-function primitives;
- classified one-variable exact polynomial shapes through degree 4 with coefficient arrays, leading/constant terms, primitive/monic readback, and quadratic discriminants;
- classified normalized simple rational shapes with numerator/denominator polynomial metadata and denominator nonzero facts;
- added `polynomial-domain-core` as an `AssumptionFactSource`;
- added value-domain metadata helper coverage for future `exact-symbolic`, `inequality-solution-set`, and stop consumers;
- kept Equation, OOE, UI, history, result schemas, and visible solver capability unchanged.

Next rails:

- `INEQUALITY-EQUATION2`: bounded quadratic/factored real inequality solution sets.
- `COMPLEX-EQUATION2`: broader bounded polynomial/power complex answers.

### `INEQUALITY-EQUATION2` - Bounded Polynomial Inequality Sets

Type: Equation product route.

Status: implemented on 2026-06-03.

Goal:

- expand Equation `Exact` inequality support from linear-only to bounded one-variable polynomial inequality sets.

Completion notes:

- added a shared Equation polynomial-domain helper that extracts top-level relation zero forms and `POLYNOMIAL-DOMAIN-CORE1` metadata;
- extended `equation-inequality` to solve one-variable numeric-coefficient polynomial inequalities through degree 4 when exact real roots are available;
- added sign-chart interval-union construction over exact roots;
- preserved exact LaTeX labels for symbolic irrational bounds while keeping interval objects backwards-compatible for numeric-only bounds;
- returned `answerDomain: conditional-real` and `solutionKind: inequality-solution-set` through the existing result/history/provenance path.

Boundary:

- no rational sign charts;
- no symbolic-parameter or multivariable inequality solving;
- no trig/log/exp/absolute-value inequality solving;
- no chained inequality route;
- no `!=` route;
- no Approximate inequality sampling;
- no Isolate inequality rearrangement;
- no non-Equation adoption.

### `COMPLEX-EQUATION2` - Bounded Polynomial Complex Branches

Type: Equation product route.

Status: implemented on 2026-06-03.

Goal:

- expand opt-in Equation complex exact answers from quadratics/simple powers to bounded factorable polynomial equations.

Completion notes:

- added a factorable complex-polynomial route for `Complex On + Exact`;
- supports one-variable polynomial equations through degree 4 when bounded factorization reduces to linear and quadratic factors;
- returns complex-domain results only when at least one branch is non-real;
- preserves existing selected-target power complex behavior;
- normalizes simple complex branch factors such as `1/2 sqrt(12)i` into `sqrt(3)i`.

Boundary:

- no complex parser;
- no stored complex variables;
- no Approximate complex search;
- no Isolate complex solving;
- no unfactorable cubic/quartic formulas;
- no numeric-only fake exact roots;
- no non-Equation adoption.

### `INEQUALITY-EQUATION3` - Unified Real Inequality Decision Engine

Type: major Equation product route.

Status: implemented on 2026-06-03.

Goal:

- expand Equation `Exact` inequality solving from polynomial-only into one guarded real decision engine without pretending to be a full CAS inequality solver.

Proof contract:

- Exact Guarded.
- Exact roots and critical points define the decision cells.
- Numeric sampling may classify open cells.
- Numeric-only roots or critical points cannot become Exact answers.

Completion notes:

- added `src/lib/algebra/inequality-sign-analysis-core.ts` for critical points, domain exclusions, cell sampling, and interval-set conversion;
- extended `INEQUALITY-CORE1` with finite-union helpers and periodic inequality-set readback;
- added factorable rational sign-chart support with denominator exclusion facts;
- added textbook absolute-value inequalities such as `|x-2|<3` and `|2x+1|>=5`;
- added guarded radical inequalities such as `sqrt(x-1)>=2` and `sqrt(x^2-1)<=3`;
- added monotone log/exp inequalities such as `ln(x-2)<4` and `e^x>=5`;
- allowed bounded two-layer supported composition where the outer operations stay monotone/guarded;
- added direct affine periodic trig inequalities such as `sin(x)>1/2`, `cos(2x)<=0`, and `tan(x)>1`;
- preserved `answerDomain: conditional-real` and `solutionKind: inequality-solution-set`.

Boundary:

- no Approximate inequality sampling;
- no Isolate inequality rearrangement;
- no graphing;
- no chained inequalities;
- no `!=` route;
- no symbolic-parameter or multivariable inequality solving;
- no deep arbitrary composition;
- no non-affine trig composition;
- no numeric-only roots masquerading as Exact;
- no non-Equation adoption;
- no OOE runtime behavior change;
- no Rust solver execution.

Next recommended sequence:

- stabilize `INEQUALITY-EQUATION3` through manual examples and readback polish before another large inequality leap;
- then consider narrower follow-ups for rational/radical/log/exp/trig wording, periodic-family UI/readback, or a separately scoped `INEQUALITY-EQUATION4` if a clear bounded family emerges;
- keep future complex expansion separate from inequality expansion even when both reuse the shared value/domain/fact substrate.

### `INEQUALITY-READBACK-COMPOSITION1` - Valid-When Restrictions And Guarded Composition Polish

Type: Equation product/readback polish route.

Status: implemented on 2026-06-03.

Goal:

- make inequality result cards read like the rest of Equation by putting restrictions in `Valid when`;
- expand guarded finite composition without pretending to support arbitrary inequality algebra;
- add the first representable two-trig-layer inequality support.

Completion notes:

- main inequality answers now stay focused on the solution set;
- denominator exclusions, radicand/log domains, monotone-base facts, tangent singularities, period/family facts, and real-order notes now move into `Valid when`;
- proof detail sections now carry route narration only and should not duplicate moved validity facts;
- finite guarded composition supports up to 4 supported wrappers over the existing real inequality routes;
- representable two-layer trig supports outer `sin`/`cos`/`tan` over inner affine `sin`/`cos`, plus guarded range-reducible cases such as `tan(sin(x))>1`;
- inner `tan` support is limited to all/empty outer-range cases such as `sin(tan(x))<2`, with tangent singularities in `Valid when`; nontrivial cases such as `sin(tan(x))<1/2` remain controlled stops because the current periodic readback model cannot honestly express the repeated tangent-branch subfamilies.
- simple target-free numeric shells around supported inequality carriers can be peeled before routing, including additive moves, positive scaling, and negative scaling with relation flips;
- verbose `Valid when` and proof/detail cards can collapse and expand, preserving the main answer while keeping long periodic/domain facts accessible.

Boundary:

- no Approximate inequality sampling;
- no Isolate inequality rearrangement;
- no graphing;
- no chained inequalities;
- no symbolic-parameter or multivariable inequality solving;
- no complex ordered inequalities;
- no non-Equation adoption;
- no OOE runtime behavior change;
- no Rust solver execution.

Next recommended sequence:

- test the new Valid When placement manually with rational, radical, log, exp, direct trig, and two-layer trig examples;
- if the user wants another leap, prefer a separate periodic-readback substrate before deeper inner-`tan` or trig-composition expansion;
- keep future complex expansion separate from inequality expansion.

### `INEQUALITY-PREIMAGE-READBACK2` - X-Family Periodic Readback And Rational Nesting Polish

Type: Equation product/readback polish route.

Status: implemented on 2026-06-03.

Goal:

- finish the pending `INEQUALITY-PREIMAGE1` work as one combined milestone;
- flatten safe abs-affine periodic preimages into `x`-alone branch families;
- clean periodic symbolic readback and output-style handling;
- push bounded finite rational/nested preimages without entering Tier 4 nonlinear periodic solving.

Completion notes:

- abs-affine periodic inequalities such as `tan(|5x-4|)>1/2`, `sin(|x-4|)>1/2`, `cos(|2x+1|)<=0`, and `tan(|x-4|)/4-55<=4` now flatten through the absolute-distance split into `x`-family branches when safe;
- distance-family notation is kept as proof/fallback vocabulary rather than the preferred main answer;
- periodic readback uses calculator-style symbolic shifts such as `k\pi`, `2k\pi`, and `\frac{k\pi}{5}`;
- `Period` / branch-step facts and tangent singularities are carried in `Valid when`;
- readback respects the existing `EXACT` / `DECIMAL` / `BOTH` output-style setting for inverse-trig thresholds;
- bounded finite preimage routing now works more consistently for supported rational/polynomial inners under `abs`, `sqrt`, `ln`/`log`, and `exp`;
- unsupported periodic-over-rational, periodic-over-nonlinear-abs, symbolic-threshold, chained, multivariable, and Tier 4 nonlinear periodic preimages remain controlled stops.

Boundary:

- no Approximate inequality sampling;
- no Isolate inequality rearrangement;
- no complex ordered inequalities;
- no graphing;
- no non-Equation adoption;
- no OOE runtime behavior change;
- no Rust solver execution.

Next recommended sequence:

- manually test the x-family branch readback under `EXACT`, `DECIMAL`, and `BOTH`;
- if more inequality work is needed, prefer a separate periodic-preimage model upgrade before nonlinear periodic or rational-periodic preimages;
- otherwise return to complex expansion or the paused OOE roadmap only after the Equation inequality surface is stable.

### `INEQUALITY-STABILITY1` - Equation Inequality Stability Gate

Type: Equation product stability gate.

Status: implemented on 2026-06-03.

Goal:

- stabilize the current Equation-only inequality engine before further complex or inequality expansion;
- harden relation-operator normalization across typing, paste/copy, replay, and runtime paths;
- add broad regression coverage for the current supported guarded real inequality families;
- keep unsupported families as controlled stops.

Completion notes:

- normalized `<=`, `>=`, `< =`, `> =`, `=<`, `=>`, Unicode `≤` / `≥`, and LaTeX `\leqslant` / `\geqslant` forms into canonical relation operators;
- added runtime-side normalization so history/replay/copy paths do not rely only on MathEditor live input cleanup;
- added regression coverage for repeated roots, no-real polynomial inequalities, rational/finite-wrapper/trig/preimage families, chained stops, and UI routing;
- updated unsupported-route guidance to describe the guarded real inequality family boundary instead of naming an old milestone.

Boundary:

- no new inequality family;
- no Approximate inequality sampling;
- no Isolate inequality solving;
- no graphing;
- no chained, multivariable, or symbolic-parameter inequality solving;
- no complex ordered inequalities;
- no non-Equation adoption;
- no OOE runtime behavior change;
- no Rust solver execution.

Next recommended sequence:

- manually verify common typed/pasted relation variants in Equation symbolic;
- then decide whether the next step is more inequality periodic-preimage modeling, another complex expansion slice, or returning to the paused OOE roadmap.

## Relationship To OOE

### `COMPLEX-INPUT1` - Complex Input Contract

Type: Equation product/input contract.

Status: implemented on 2026-06-04.

Completion notes:

- standalone `i` now canonicalizes to `\imaginaryI` only for Equation input;
- `\imaginaryI` is preserved across typed/pasted/copied/replayed Equation paths;
- `ImaginaryUnit` is reserved from target discovery and does not appear as a solve target or symbolic parameter;
- `Complex Off` returns controlled guidance for explicit imaginary input;
- Equation OOE provenance records explicit imaginary input.

Boundary:

- `j` is deferred;
- no stored complex values;
- no non-Equation adoption;
- no Approximate complex search;
- no Isolate complex solving;
- no broad user-input complex parser beyond `i` / `\imaginaryI`.

Next:

- `COMPLEX-EQUATION3` consumes this input contract for bounded algebraic exact complex routes under `Complex On`.

### `COMPLEX-EQUATION3` - Major Algebraic Complex Engine

Type: Equation product complex route.

Status: implemented on 2026-06-04.

Completion notes:

- consumes `COMPLEX-INPUT1` so explicit `i` / `\imaginaryI` inputs can participate in bounded complex Equation solving;
- adds exact complex branch/readback helpers with stable ordering, dedupe, and clean `i`, `-i`, and `a+bi` / `a-bi` formatting;
- supports direct explicit imaginary linear equations such as `x+\imaginaryI=0` and `x-(2+3\imaginaryI)=0`;
- supports bounded real-coefficient factorable polynomial equations through degree 4 when factors reduce to supported linear/quadratic branches and at least one branch is non-real;
- keeps selected-target power carriers on the bounded complex algebraic route;
- supports rational equations by solving numerator roots and moving denominator exclusions into `Valid when`;
- respects `EXACT`, `DECIMAL`, and `BOTH` output style for complex branch readback where approximate branch values are available.

Boundary:

- no stored complex values;
- no non-Equation adoption;
- no complex Approximate search;
- no Isolate complex solving;
- no complex trig/log/exp route;
- no Cardano/Ferrari unfactorable cubic/quartic formulas;
- no numeric-only roots masquerading as Exact;
- no OOE runtime behavior change;
- no Rust solver execution.

Next:

- plan complex readback/composition/preimage milestones separately for trig/log/exp complex behavior, mirroring the inequality sequencing instead of folding those families into `COMPLEX-EQUATION3`.

OOE remains paused after `OOE-RS25` while this roadmap starts.

The next OOE upgrades are still:

- `OOE-RS26`: Equation guarded-stage cancellation checkpoints.
- `OOE-RS27`: Equation heavy-helper isolation pilot.
- `OOE-RS28`: Broader Equation cancellation coverage.
- `OOE-RS29`: Developer diagnostics surface or local read-only MCP diagnostics, to be chosen later.

The reason to pause is not that OOE is wrong. It is that cancellation and isolation should wrap the solver contract Calcwiz is actually moving toward: real, complex, inequality-aware, and explicit about answer intent.

## Initial Test Themes

- real-only behavior stays stable where no complex/inequality route is requested;
- complex answers never masquerade as real answers;
- "no real solution" remains valid when the selected answer domain is real;
- inequality facts do not silently become global assumptions;
- existing Equation answer modes keep their contracts;
- `Valid when` facts remain readable and safe;
- diagnostics/provenance can distinguish exact, approximate, isolate, inequality, real, and complex outcomes once OOE resumes.
