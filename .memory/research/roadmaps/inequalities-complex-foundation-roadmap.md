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

### `INEQUALITY-EQUATION1` - First Product Inequality Route

Type: product-facing, after `INEQUALITY-CORE1` and `VALUE-DOMAIN-CORE1`.

Goal:

- add a bounded inequality-solving route without pretending to be a general CAS inequality engine.

Possible first targets:

- linear inequalities in one variable;
- quadratic sign-chart families with real roots;
- rational sign-chart families with explicit denominator exclusions.

Boundary:

- no multivariable inequalities;
- no nested absolute-value inequalities unless separately scoped;
- no trig/log/exponential inequality families in the first product route.
- no visible inequality adoption outside Equation.

### `ANSWER-DOMAIN-READBACK1` - Result And History Polish

Type: integration polish.

Goal:

- make real/complex/inequality outcomes understandable and replay-safe.

Expected scope:

- result-card notes for answer domain when needed;
- consistent `Valid when` and inequality-set display;
- history replay safety for domain-aware results;
- copy/editor behavior for complex and inequality outputs.

Boundary:

- no new solver family beyond already implemented bounded routes.

## Relationship To OOE

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
