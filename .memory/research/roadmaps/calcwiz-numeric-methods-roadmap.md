# Calcwiz Numeric Methods Roadmap

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Status

Created on 2026-06-28 as a pre-implementation roadmap.

This roadmap is not one of the future eight implementation moves. It exists so the eight-move numeric session can be planned against a stable policy instead of widening numeric behavior blindly.

Refined on 2026-06-29: the future implementation session is Equation-owned. Statistics, Limits, Differentiation, and Calculus are included here only for shared numeric policy and contract enforcement so other agents can work those lanes without this Equation track interfering with their implementations.

Refined again on 2026-06-29: Equation keeps one visible solve entry. Numeric solving is a route choice inside the existing Solve/Run flow, not a second user-facing solver. Algebra/F4 owns explicit stored-value substitution consent for parameterized equations only: it may appear whenever the selected solve target has one or more non-target parameter variables, and clicking it must either run with a one-shot stored-value snapshot or show a missing-stored-value error. Functions, constants, and units such as `sqrt`, `sin`, `pi`, and `i` are not parameters.

Updated on 2026-06-29: `EQUATION-STORED-VALUE-SOLVE-CONSENT1` implements the visible Algebra/F4 action as `Use Stored Values`. The remaining implementation moves begin with deterministic numeric algebraic solving; this roadmap still treats numeric solving as part of normal Equation Solve/Run, not as a second button or mechanism.

Updated again on 2026-06-29: `EQUATION-DETERMINISTIC-NUMERIC-ALGEBRAIC1` and `EQUATION-NUMERIC-DOMAIN-SEGMENTATION1` are intentionally bundled in one backend commit because deterministic polynomial/rational numeric validation needs the segmentation substrate for denominator exclusions, domain facts, sampled hazards, and rejected-candidate evidence. The bundle stays exact-first, real-output-only, and routes only after supported exact symbolic solving misses.

Updated for `EQUATION-REAL-NONLINEAR-NUMERIC-SEARCH1` on 2026-06-29: Real nonlinear numeric fallback is now live after exact symbolic/formula and deterministic algebraic routes miss. It uses target-aware interval sampling/refinement over bounded expanding windows only for non-periodic nonlinear or discontinuity-heavy numeric-ready equations, reports bounded-search caveats, and keeps periodic/trig fallback interval-first for the next separate milestone.

No code, solver behavior, Display, Formula Viewer, Copy Result, History, OOE, app-state, Tauri, persisted schema, or public runtime contract changes are included here.

## Purpose

Calcwiz should pause broad new Equation symbolic capability expansion after the narrow symbolic polish closeout and shift the next major Equation investment toward practical numeric solving.

The goal is not to replace symbolic solving with silent numeric fallback. The goal is to make numeric solving broad and predictable when the problem is genuinely numeric:

- the solve target is known and protected;
- all non-target symbols either remain symbolic or have explicit stored numeric values approved for the numeric run;
- the route can evaluate the equation reliably;
- every returned candidate is validated against the original equation;
- the result states its method, values used, searched region when applicable, residual, exclusions, and confidence/completeness limits.

## Inputs

This roadmap is grounded in:

- `.memory/research/audits/equation-symbolic-lane-pause-audit0-2026-06-28.md`
- `.memory/research/audits/equation-numeric-interval-revival0-2026-06-21.md`
- `docs/architecture/equation/equation-numeric-interval-district.md`
- `.memory/research/roadmaps/variable-values-and-substitution-roadmap.md`
- `.memory/research/roadmaps/calculus-roadmap.md`
- current Equation numeric interval, candidate-validation, stored-value substitution, Calculus numeric integration, Limits, Differentiation, and Statistics source surfaces.

## Locked Principles

- Numeric solving is a separate route family, not a weakening of the guarded symbolic solver.
- Equation symbolic solve keeps ignoring stored values unless a future explicit symbolic action says otherwise.
- Numeric solving runs through the existing Equation Solve/Run path. Do not add a second visible solve mechanism for numeric roots.
- Numeric solving may use stored values only through explicit Algebra/F4 substitution consent, with the solve target protected and the used-value snapshot shown in the result.
- Algebra/F4 substitution consent is relevant only when editor analysis finds a selected target plus one or more non-target parameter variables. Reserved functions, constants, and units do not count as parameters.
- The substitution option should remain visible for parameterized equations even when some parameters have no stored values; clicking it must return a clear missing-value result rather than disappearing or failing silently.
- Expressions with unresolved non-target symbols are still symbolic problems, not numeric problems.
- Single-target equations such as `x^2+x+1=0` do not need substitution consent. The normal Solve/Run path should classify and solve them under the established symbolic/numeric boundaries.
- Numeric interval solving is for local/windowed roots, periodic/trig families, discontinuities, dense roots, and cases where the user needs roots in a region. It is not the default way to solve simple algebraic equations such as `x+5=8`.
- Deterministic numeric algebraic methods should handle numeric polynomial/rational/algebraic cases without asking for an arbitrary interval when a global finite-root method is available.
- Bracketed methods such as Brent or TOMS748-style search should be the reliability core for one-dimensional real nonlinear roots. Newton/secant methods may accelerate after bracketing or with guarded fallback; they should not be the only proof of a root.
- Residual minimization is needed for even-multiplicity/tangent roots that do not produce sign changes.
- Domain segmentation must split around denominator zeros, log/root domain boundaries, trig poles, and detected discontinuities before search.
- Monte Carlo is not an ordinary one-variable Equation root-finding method. It belongs later to Statistics/probability/simulation and possibly high-dimensional numerical integration after separate policy.
- Cardano and Ferrari remain symbolic exact formula/readback routes. Numeric degree-3/4 solving must use numeric polynomial/root methods or existing guided polynomial numeric fallback, not Cardano/Ferrari formula expansion.
- Future step-by-step output must preserve that distinction: simple/factorable/special-form numeric polynomials should explain factor/inversion/numeric-root methods; Cardano/Ferrari derivations should be advanced/collapsed symbolic exact material, never the default numeric teaching path.
- Real numeric solving comes first. Complex numeric solving needs a separate later policy for two-real-variable residual systems, branch cuts, seed strategy, and confidence wording.

## Architecture Boundary

Calcwiz should build shared numeric primitives, not a single global numeric solver authority.

Shared numeric toolbox candidates:

- numeric expression evaluation and target-aware substitution;
- finite real/complex scalar parsing;
- tolerance and residual policy;
- interval subdivision and discontinuity probes;
- bracketed root search;
- guarded Newton/secant accelerators;
- residual minimization for tangent roots;
- polynomial numeric root helpers;
- candidate validation against source expressions;
- method/readback formatting;
- optional deterministic/random sampling utilities for domains that truly need them.

Domain-owned orchestration stays separate:

- Equation owns equation root solving, branch enumeration, target protection, and root validation.
- Calculus owns definite integration quadrature, improper-integral safety, local limit approach, and derivative approximation policy.
- Statistics owns sampling distributions, simulation, resampling, confidence intervals, and any Monte Carlo workflow.
- Limits own directional/local approach semantics and indeterminate-form honesty.
- Differentiation owns derivative-at-point approximation, finite-difference stencil policy, symbolic derivative fallback, and error estimates.

This Equation track may enforce shared numeric policies and contracts for those other domains, but it must not implement their domain-specific algorithms, UI flows, runtime behavior, or result schemas. Other agents may work Statistics, Limits, Differentiation, and Calculus against these contracts in their own lanes.

The shared toolbox may remove duplicated mechanics, but it must not merge workspace runtimes, OOE capabilities, result schemas, or user-facing responsibilities.

## Current Assets

Live assets that the numeric track should reuse:

- Equation Numeric Interval district with interval parsing, adaptive sampling, bisection-style recovery, local-minimum recovery, candidate validation, trig guidance, and discontinuity diagnostics.
- Equation candidate validation and extraneous-solution reporting.
- Stored-value substitution policy that already protects Equation targets for numeric interval runs.
- The internal `EQUATION-NUMERIC-SHAPE-CLASSIFIER1` substrate: stored-value preparation with target protection, target-aware zero-form evaluation, numeric readiness classification, route recommendations, and internal denominator/log/root/periodic/discontinuity evidence.
- The live `EQUATION-STORED-VALUE-SOLVE-CONSENT1` Algebra/F4 action: `Use Stored Values` appears for selected-target equations with non-target parameter variables, reports missing stored values when needed, and otherwise resumes normal Solve/Run with a one-shot stored-value snapshot.
- The live `EQUATION-DETERMINISTIC-NUMERIC-ALGEBRAIC1 + EQUATION-NUMERIC-DOMAIN-SEGMENTATION1` bundle: after supported exact symbolic solving misses, numeric-ready single-target polynomial/rational equations can return validated real approximate roots through degree `64`, with denominator/domain facts, residual evidence, and rejected-candidate details kept in detail sections rather than global `Valid When`.
- The live `EQUATION-REAL-NONLINEAR-NUMERIC-SEARCH1` route: after exact and deterministic routes miss, numeric-ready non-periodic nonlinear or discontinuity-heavy Real Equation inputs can return validated approximate real roots from bounded expanding windows with target-aware evaluation, interval refinement, local-minimum recovery, searched-window caveats, domain/exclusion facts, residuals, and rejected-candidate evidence.
- Numeric evaluators under `src/lib/numeric/`.
- Guided polynomial numeric fallback for degree 3/4 UI cases, separate from symbolic Cardano/Ferrari.
- Calculus adaptive Simpson numeric definite integration.
- Calculus finite-limit and symbolic limits surfaces.
- Symbolic differentiation and derivative-at-point workflow surfaces.
- Statistics runtime and inference surfaces.

Known remaining prerequisites before broad numeric Equation implementation:

- a clear result/readback contract for residuals, values used, exclusions, searched ranges, and completeness confidence.

## Future Eight Moves

The future implementation session should start after this roadmap is accepted. The roadmap itself is outside the eight moves.

### 1. `EQUATION-SYMBOLIC-POLISH-CLOSEOUT1`

Close the narrow symbolic polish before pausing new Equation symbolic breadth:

- move target-dependent Complex principal-image facts out of global `Valid When` and into candidate-local/substituted guards where needed;
- use candidate-root wording when branch-local guards may filter results;
- simplify safe small coefficient facts such as `2b\ne0` to `b\ne0`;
- keep existing symbolic routes live and maintained.

### 2. `EQUATION-NUMERIC-ELIGIBILITY-VARIABLE-POLICY1`

Build the numeric eligibility gate:

- explicit stored-value substitution consent through the agreed Algebra/F4 action surface;
- show the substitution option whenever the selected target has one or more non-target parameter variables, even if some parameters lack stored values;
- report missing stored values clearly when the substitution option is clicked without values for every non-target parameter;
- solve target protection;
- one remaining unknown target after approved stored-value substitution;
- visible used-value snapshot and ignored/protected variable evidence;
- no separate visible numeric-solve button; numeric route selection remains inside the existing Solve/Run flow;
- no Equation symbolic stored-value substitution.

### 3. `EQUATION-NUMERIC-SHAPE-CLASSIFIER1`

Add an Equation-owned numeric shape classifier:

- linear/affine;
- polynomial and rational;
- algebraic/radical;
- exp/log/transcendental;
- trig/periodic;
- mixed transcendental;
- discontinuity-heavy;
- unsupported/non-evaluable.

This classifier should route numeric work once, record evidence, and avoid duplicated local recognizers in later numeric solvers.

The classifier is internal route intelligence for Solve/Run. It must use the same variable truth as the editor-analysis chips: parameters are non-target variables, while reserved functions/constants/units are not variables.

### 4. `EQUATION-DETERMINISTIC-NUMERIC-ALGEBRAIC1` - live, bundled with move 5

Solve numeric algebraic cases without arbitrary intervals when global finite-root methods are appropriate:

- direct numeric linear/quadratic/polynomial/rational cases;
- factorable/special-form numeric cases that already have compact exact or approximate evidence;
- numeric degree-3/4 roots through numeric root methods, not Cardano/Ferrari symbolic formulas;
- candidate validation and exclusion facts.

### 5. `EQUATION-NUMERIC-DOMAIN-SEGMENTATION1` - live, bundled with move 4

Add the domain and segmentation layer:

- denominator-zero detection;
- log/root domain checks;
- trig poles;
- discontinuity and asymptote probes;
- interval splitting and search-window normalization;
- classification of global finite-root versus local-window problems.

### 6. `EQUATION-REAL-NONLINEAR-NUMERIC-SEARCH1` - live

Add robust one-dimensional real nonlinear search:

- bracketed Brent/TOMS748-style core;
- guarded Newton/secant acceleration;
- residual minimization for tangent/even-multiplicity roots;
- adaptive sampling with route-specific density;
- validation against the original equation and substituted value snapshot.

### 7. `EQUATION-REAL-PERIODIC-INTERVAL-NUMERIC1`

Make periodic and interval solving intentional:

- interval-first root enumeration for trig and periodic families;
- period-aware branch/window summaries when the period is reliable;
- dense-root guidance and subdivisions/readback polish;
- local completeness wording;
- final Equation numeric readback closeout for residuals, methods, values used, exclusions, and candidate validation.

### 8. `NUMERIC-METHODS-DOMAIN-POLICY-WIDENING1`

Enforce numeric policy and contracts beyond Equation without turning Equation's solver into a shared authority or implementing other domains:

- Statistics: lock where simulation, random sampling, resampling, and Monte Carlo belong, but do not implement them in this Equation session.
- Limits: lock shared wording and contract expectations for local numeric approach, directional sampling, asymptote handling, and confidence, but leave limit algorithms to the Limits/Calculus lane.
- Differentiation: lock shared wording and contract expectations for derivative-at-point approximation, finite-difference stencil policy, step-size adaptation, and error estimates, but leave implementation to the Differentiation/Calculus lane.
- Calculus integration: record how existing adaptive Simpson and future high-dimensional/Monte Carlo possibilities relate to the shared numeric toolbox, but leave integration implementation to the Calculus lane.
- Produce policy/contract handoff notes for other agents instead of editing their domain implementations.

## Stop Rules

- Do not route unresolved symbolic parameter equations to numeric solving without approved stored values.
- Do not substitute the solve target.
- Do not make interval solve the default for simple deterministic algebraic equations.
- Do not claim all roots for local interval searches.
- Do not weaken `hasUnsafeSymbolicOutput` or symbolic guarded solving to make numeric easier.
- Do not put Monte Carlo into ordinary Equation root solving.
- Do not make Calculus, Statistics, Limits, or Differentiation depend on Equation numeric orchestration.
- Do not implement Statistics, Limits, Differentiation, or Calculus capability inside this Equation numeric session; enforce only policies, contracts, and handoff notes for those lanes.
- Do not add public schema/runtime changes unless a later implementation milestone explicitly approves them.

## Next Planning Gate

The next implementation move is `EQUATION-REAL-PERIODIC-INTERVAL-NUMERIC1`. It should keep unsupported periodic/trig numeric fallback interval-first: without a real window it should return guidance, while interval runs should enumerate validated roots only inside the chosen interval using target-aware, segmentation-aware numeric interval mechanics.
