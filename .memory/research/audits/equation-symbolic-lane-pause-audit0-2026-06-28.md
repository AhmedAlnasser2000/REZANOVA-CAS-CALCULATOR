# EQUATION-SYMBOLIC-LANE-PAUSE-AUDIT0

Date: 2026-06-28

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

Audit the current Equation symbolic solver surface and record a proposed pause point for new Equation symbolic capability work before planning a broader numeric solver pipeline.

This is an Equation-only audit. It is not an app-wide symbolic stop:

- Calculus symbolic integration work is not paused by this note.
- Calculate algebra actions are not paused by this note.
- Symbolic Primitives are not globally frozen by this note.
- Existing Equation symbolic routes remain live and maintained.
- Bug fixes, readback polish, safety fixes, tests, and correctness repairs remain allowed.

This artifact intentionally does not update `.memory/current-state.md`, `.memory/decisions.md`, the journal, or a session dossier because there is active unrelated Risch-Norman/Calculus work in those shared memory files.

## Worktree Safety Note

At audit time, the worktree already contained unrelated active changes in:

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-28.md`
- `.memory/sessions/2026-06/2026-06-28/2026-06-28__risch-norman-exp-sincos-mixed1/`
- `src/lib/symbolic-engine/integration/risch-norman/dispatch-probe.ts`
- `src/lib/symbolic-engine/integration/risch-norman/exp-sincos-ansatz.ts`
- `src/lib/symbolic-engine/integration-risch-norman-exp-sincos-ansatz.test.ts`

Those files belong to a separate Calculus/Risch-Norman lane and were not edited by this audit.

## Current Equation Symbolic Capability Inventory

Equation symbolic solving now has a broad, bounded, and heavily tested Exact/Isolate surface.

Core symbolic posture:

- Active Equation answer modes are `Exact` and `Isolate`; legacy Approx is no longer an active answer mode.
- Numeric Interval Solve is a contextual numeric route/tool, not a symbolic fallback mode.
- Symbolic solve preserves non-target symbols as symbolic parameters.
- Stored variable values are ignored by Equation symbolic solve, including named variables, while the solve target is always protected.
- Exact mode should claim success only when it has terminal exact evidence: symbolic roots, branch families, principal/root families, inequality sets, domain/exclusion facts, or candidate validation.
- Isolate mode may present bounded rearrangements/formulas with Valid When facts as rearrangement conditions.

Parameterized and selected-target families live today:

- affine/linear selected-target equations;
- quadratic selected-target equations;
- bounded rational equations with denominator exclusions;
- direct and safely rational-cleared cubic Cardano routes;
- direct and safely rational-cleared quartic Ferrari routes;
- factorable polynomial zero-products through the current target-degree frontier;
- exact-rational expanded factor solving where Algebra can factor into supported pieces;
- special-form roots and carrier quadratics through degree 12 where the compact route policy supports them;
- carrier elimination for explicit algebraic carriers that reduce to supported linear/quadratic carrier equations;
- exp/log inverse-pair families, including supported symbolic-base cases;
- bounded trig direct and same-argument mixed sine/cosine identities;
- guarded radicals, absolute-value, conjugate, rational-power, and selected composition families;
- inequalities over the current bounded real line/order families;
- guided polynomial and bounded polynomial-system surfaces.

Real wrapper formula families live today:

- one-layer square-root, absolute-value, square-power, odd-power, higher-even-power, nth-root, exp/log, and trig formula wrappers;
- affine single-root radical shells;
- mixed radical shells with one selected-target square-root carrier;
- mixed exp/log affine shells around one selected-target carrier;
- mixed trig affine shells and same-argument sine/cosine forms;
- exact depth-2 algebraic nested wrappers;
- Real generated Cardano/Ferrari formula payloads with row-local case guards and closed non-generic Ferrari readback.

Complex symbolic families live today:

- Complex On may return real roots, non-real roots, or both.
- direct Complex linear/rational/polynomial and preimage families;
- Complex Cardano/Ferrari for top-level cubic/quartic solving, while explicit generated Complex Cardano/Ferrari wrapper formula readback is retired;
- exact-rational Complex special forms and compact high-index power readback using `PrincipalRoot_n(...)\omega_k`;
- one-layer Complex power wrappers as all-branch relations;
- one-layer Complex principal root wrappers guarded by principal-image facts;
- exact-constant affine exp/log/trig wrapper preimage catchup;
- compact mixed algebraic root wrappers with one principal root carrier plus a bounded algebraic companion;
- Complex abs wrappers policy-locked as magnitude/locus semantics and unsupported until set/locus output exists;
- Complex nested wrapper readiness substrate only, with no new visible nested route.

Numeric route surface today:

- Numeric Interval Solve already supports explicit local real-window solving.
- It substitutes stored non-target values only for the numeric route and protects the solve target.
- It stops on missing numeric values for non-target parameters.
- It validates candidate roots against the original equation.
- It handles bracket-first solving, adaptive refinement, even-multiplicity root recovery, discontinuity rejection, angle-unit-aware trig behavior, and branch guidance for some absolute-value/trig cases.
- It remains local/windowed and intentionally does not claim all real roots globally.

## Pause Finding

The Equation symbolic lane is complete enough to pause new capability expansion after the currently discussed Complex/readback polish.

This pause should mean:

- do not start new Equation symbolic breadth milestones merely because another wrapper or symbolic family is mathematically possible;
- do not pursue explicit generated Complex Cardano/Ferrari wrapper formula readback;
- do not widen symbolic caps just to chase broader coverage without a concrete product need;
- do not add new Equation symbolic infrastructure before the numeric solver pipeline is planned.

This pause should not mean:

- disabling existing symbolic routes;
- refusing symbolic bug fixes;
- refusing readback and Valid When polish;
- refusing tests that lock existing behavior;
- blocking other workspaces' symbolic lanes;
- preventing future Equation symbolic work when a focused user-facing need appears.

## Recommended Immediate Closeout Before Numeric Planning

Finish a narrow Equation symbolic polish slice:

- move target-dependent Complex principal-image facts out of global Valid When and into candidate-local guards or substituted branch-local conditions;
- change count wording to candidate roots when row-local guards can filter results;
- simplify small coefficient facts such as `2b\ne0` to `b\ne0` where producer-side safe;
- keep Copy Result, Formula Viewer contracts, OOE, History, app-state, Tauri, and persisted schemas unchanged unless a concrete bug requires otherwise.

After that, pause new Equation symbolic capability expansion and plan a dedicated numeric solver pipeline.

## Numeric Pipeline Direction

The next major Equation track should be a predictable Real numeric solver pipeline, not a silent symbolic fallback.

Suggested pipeline shape:

1. Numeric eligibility gate:
   - explicit user approval to use stored values;
   - never substitute the solve target;
   - substitute only non-target stored numeric values;
   - require exactly one remaining unknown target;
   - snapshot substituted values into the result.
2. Numeric shape classifier:
   - classify linear, polynomial, rational, algebraic/radical, exp/log, trig/periodic, mixed transcendental, discontinuous/pole-heavy, or unknown evaluable forms once.
3. Deterministic numeric algebraic layer:
   - solve direct numeric algebraic cases without requiring a user interval when a deterministic numeric method is appropriate.
4. Domain and segmentation layer:
   - split by exclusions, log/root domains, denominator zeros, trig poles, and finite inferred bounds where possible.
5. Nonlinear search layer:
   - use deterministic adaptive search, Brent/TOMS748-style bracketed solving, Newton/secant only as accelerators, and minimization of residuals for tangent roots.
6. Periodic/trig layer:
   - use user intervals where infinite roots make local windows valuable; lift periodic branch summaries only when period detection is reliable.
7. Validation/readback layer:
   - validate every candidate against the original numeric equation;
   - report residuals, searched intervals, values used, exclusions, discontinuities, and completeness confidence.

Complex numeric solving should come after the Real numeric pipeline foundation because it needs a separate 2D root-finding policy over real and imaginary residuals, branch-cut handling, seed strategy, and much stricter confidence wording.

## Discussion Questions

- Should the next committed memory update merge this audit into current-state and decisions after the unrelated Risch-Norman memory lane is clean?
- Should the numeric solver pipeline begin as an audit/roadmap milestone before code, mirroring the integration classifier-first approach?
- Should deterministic numeric algebraic solving be separate from interval solving in the visible UI, or should both live behind one Numeric Solve panel with route-specific wording?
