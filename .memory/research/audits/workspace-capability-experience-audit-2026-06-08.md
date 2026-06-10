# WORKSPACE-CAPABILITY-EXPERIENCE0: App-Wide Capability/Experience Boundary Audit

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Summary

This audit records a product architecture boundary before changing Trigonometry or widening more OOE lanes:

- **Reusable math cores and capability layers own mathematical truth.**
- **Workspaces own user experiences and workflows.**
- **OOE owns runtime traffic control, not math/product boundaries.**

The goal is not to undo reusable cores. It is to stop workspace surfaces from becoming redundant capability buckets. Shared cores should remain reusable by Calculate, Equation, Calculus, Trigonometry, Statistics, Geometry, Matrix, Vector, Table, and future surfaces. The product layer should then decide which experience best frames that capability for the user.

## Locked Principle

Calcwiz should separate:

1. **Core ownership**
   - Algebra, calculus, trigonometry, numeric, domain, assumptions, display/readback, and branch/fact logic live in shared core modules.
   - No workspace should be the exclusive owner of derivative, integral, trig, domain, assumption, or readback truth.

2. **Capability ownership**
   - Capabilities are callable operations over those cores: evaluate, solve, transform, analyze, sample, generate table rows, compute statistics, solve triangles, classify a periodic form, etc.
   - Capabilities should have explicit contracts and provenance.

3. **Workspace ownership**
   - Workspaces are user experiences: quick calculation, relation solving, guided calculus, trig understanding, data analysis, geometry construction/measurement, linear algebra operations.
   - Workspaces may call many capabilities, but their UI and History should express one user intent.

4. **Runtime ownership**
   - OOE controls lifecycle, host routing, cancellation, stale commits, diagnostics, launch ordering, and background completion.
   - OOE should not be used to decide whether Trigonometry or Equation owns trig solving.

## Current Workspace Boundary Map

| Workspace | Intended Experience | Current Capability Use | Boundary Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Calculate | Quickform evaluator for one-shot expression work. | Uses expression engine, algebra transforms, calculus detection, numeric/trig evaluation, stored values. | Medium: guided derivative/integral/limit routes can blur with Calculus. | Keep quick expression evaluation broad, but avoid deep guided calculus workflows here. Consider turning remaining guided calculus routes into shortcuts/send-to Calculus later. |
| Equation | Relation/constraint solver. | Consumes algebra, trig, log/exp, complex, inequality, numeric interval, domain/fact/readback helpers. | Low conceptually, high implementation density. | Correct as the general solve surface. It may solve equations involving trig/calculus/sums later if supported cores exist. |
| Calculus | Guided calculus workbench. | Uses `src/lib/advanced-calc/*` internals, calculus core/eval/strategy, ODE/series/partials. | Low after `CALCULUS-WORKSPACE-MERGE1`; internal `advanced-calc` naming remains technical debt. | Keep as the richer workflow surface for derivatives, integrals, limits, series, ODEs, and partials. |
| Trigonometry | Guided trig understanding workspace. | Owns trig parser/functions/identities/equations/triangles and delegates equation solving through shared Equation. | High: `Functions` and `Equations` can duplicate Calculate and Equation instead of teaching trig structure. | Audit and prune first. Keep unit-circle/special angles/identities/triangles/angle conversion. Reframe equation solving as guided setup/handoff. Add Period and Phase Analyzer as a true trig experience. |
| Table | Sampling/tabulation workspace. | Uses table worker runtime and expression evaluation. | Low. | Keep as sampling/row generation, not a general expression workspace. |
| Statistics | Data/probability/inference workflow. | Owns statistics parser/core/runtime and OOE worker/tickets. | Low. | Keep as a guided data-analysis experience. |
| Matrix | Numeric matrix operation workspace. | Uses linear algebra cores and shared worker/tickets. | Low. | Keep separate from Vector for now; OOE already widened. |
| Vector | Numeric vector operation workspace. | Uses vector cores and shared worker/tickets. | Low. | Keep separate from Matrix for now; OOE already widened. |
| Geometry | Geometry construction/measurement workspace. | Uses geometry core/workbench and shared scalar math. | Medium unknown. | Defer deeper boundary work until after Trigonometry cleanup; likely should focus on geometric objects, constructions, and measurements. |
| Guide | Learning/reference surface. | Links to domains/articles/examples. | Low. | Keep as explanation/navigation, not execution owner. |
| Labs | Dev/incubation surface. | Runs explicitly enabled playground previews. | Low if isolated. | Keep dev-only and one-way. |

## Trigonometry Findings

`TRIGONOMETRY-SURFACE1` has now applied the audit's stricter product boundary. The visible Trigonometry home keeps only `Identities`, `Triangles`, and `Angle Convert`; direct trig values route through Calculate; general trig equation solving routes through Equation; and special-angle reference moved into Guide as a visual Unit Circle article with concise notes. The reusable trig cores and legacy `TrigScreen` values remain available for compatibility and future features.

Current Trigonometry home entries are:

- `Functions`: evaluate sin, cos, tan, and inverse trig functions.
- `Identities`: simplify/convert bounded trig identities.
- `Equations`: solve bounded trig equations in x.
- `Triangles`: right-triangle, sine-rule, and cosine-rule solvers.
- `Angle Convert`: degree/radian/grad conversion.
- `Special Angles`: exact-value reference for standard special angles.

This confirms Trigonometry is partly an experience and partly a capability bucket.

### Keep As Strong Trig Experiences

- **Triangles**
  - Clearly belongs in Trigonometry.
  - It offers a workflow Equation and Calculate should not own: triangle data entry, ambiguity, side/angle relations, and geometric interpretation.

- **Identities**
  - Belongs in Trigonometry if framed as an identity workbench.
  - It should explain transformations and preserve provenance, not merely be another Simplify button.

- **Special Angles / Unit Circle**
  - Strong Trigonometry fit.
  - Should likely become a richer `Unit Circle / Special Angles` experience rather than a static table plus quick function evaluator.

- **Angle Convert**
  - Useful utility, but small.
  - It may remain as a Trigonometry utility or become part of a future `Angles` section.

### Reframe Or Reduce

- **Functions**
  - Direct `sin(30)` style evaluation overlaps Calculate.
  - It is still useful if framed as exact-value/reference evaluation with current angle unit, quadrants, signs, and inverse-trig principal-range notes.
  - It should not be sold as a generic expression evaluator.

- **Equations**
  - Highest duplication risk.
  - Trigonometry should not become a second Equation workspace.
  - It can remain as a **Trig Equation Guide** only if it teaches unit-circle branches, periodic families, domain/range facts, and then hands off general solving to Equation.
  - General exact/numeric solving should be Equation-owned.

### Add Later

- **Period And Phase Analyzer**
  - Worthy and high-value.
  - This is the cleanest “Trigonometry as experience” addition after cleanup.
  - It should analyze forms such as `a sin(bx+c)+d`, `a cos(bx+c)+d`, and related tangent forms for amplitude, period, phase shift, midline, range, zeros, extrema, and key points.
  - It should not be introduced before removing/reframing redundant `Functions`/`Equations`, or it risks becoming another disconnected tool card.

## Capability/Core Inventory Signal

The current repo already has the right technical direction:

- `src/lib/algebra/*` holds reusable algebra/domain/fact primitives.
- `src/lib/calculus/*` holds shared calculus evaluation, strategy, verification, and limit helpers.
- `src/lib/advanced-calc/*` still hosts implementation internals for the unified Calculus workspace.
- `src/lib/trigonometry/*` has reusable trig functions, identities, equations, triangles, parser, serializer, and rewrite helpers.
- `src/lib/equation/*` consumes many shared families to solve relations.
- `src/lib/modes/calculate.ts` already treats derivative/integral/limit expressions as valid quickform inputs.
- `src/lib/ooe/*` is runtime infrastructure, not product taxonomy.

So the problem is not missing reusable cores. The problem is that some workspace surfaces still describe themselves as if each math capability belongs to one app.

## Recommended Product Boundary Language

Use this wording going forward:

- **Calculate**
  - “Fast one-shot evaluation and transformation.”
  - May evaluate derivatives, integrals, trig values, logs, and normal expressions when the user typed a direct expression.
  - Should avoid rich guided workflows and deep method controls.

- **Equation**
  - “Solve relations and constraints.”
  - May consume algebra, trig, calculus, logs, sums, assumptions, domains, and numeric helpers.
  - Owns general equation solving, including future equations that contain derivative/integral/sum notation if those capabilities are supported.

- **Calculus**
  - “Guided calculus workbench.”
  - Owns derivative/integral/limit/series/ODE/partial workflows, method choices, assumptions, validation, and richer readback.

- **Trigonometry**
  - “Guided angle, triangle, identity, and periodic-structure understanding.”
  - Owns unit-circle facts, exact values, identity transformations, angle conversion, triangle solving, and period/phase analysis.
  - Does not own general solving; it may prepare and hand off to Equation.

## Proposed Next Sequence

### 1. `TRIGONOMETRY-BOUNDARIES0`

Audit and design only.

- Inventory every Trigonometry screen, guide article, history field, parser request kind, and core helper.
- Classify each item as:
  - Keep as Trig experience.
  - Reframe as guide/setup plus handoff.
  - Merge into another workspace.
  - Keep as core only.
  - Remove from user-facing navigation.
- Decide final Trig home sections.
- Decide whether `Functions` merges into `Unit Circle / Exact Values`.
- Decide whether `Equations` becomes `Equation Setup` or leaves the Trig home.
- Define the eventual `Period and Phase Analyzer` scope.

### 2. `TRIGONOMETRY-SURFACE1`

First implementation cleanup.

- Remove or rename redundant surface items.
- Update wording, guide links, breadcrumbs, empty states, and history labels.
- Keep trig core behavior stable.
- No new solver capability.

### 3. `TRIGONOMETRY-PERIOD-PHASE1`

Add the worthy new experience after the surface is clean.

- Analyze amplitude/period/phase/midline/range/key points for bounded trig forms.
- Use shared trig/algebra/display cores.
- Keep general solving in Equation.

### 4. OOE widening for Trigonometry

Only after the surface cleanup.

- Add worker shell/tickets if Trigonometry still has explicit user-visible evaluation jobs.
- Follow the `PRE-RS34-LIVE-SNAPSHOT-GATE` rule for MathLive-backed launch snapshots.

### 5. Supercarrier/compartment hardening

Do this after product roles and runtime behavior are clearer.

- Supercarrier should harden agreed boundaries, not discover them.
- Start with an audit/spec milestone rather than a repo rewrite.

## Immediate Recommendation

Do not widen OOE to Trigonometry yet. First run `TRIGONOMETRY-BOUNDARIES0`, because OOE would otherwise harden a workspace whose role is still partly redundant with Calculate and Equation.

Do not remove reusable trig/equation/calculus cores. The cleanup should happen in navigation, wording, guide routing, history/replay framing, and visible Trigonometry workflows.

## 2026-06-10 Addendum: Calculate Boundary

`CALCULATE-BOUNDARY0` clarified that Calculate is intentionally broad, but only as a quickform evaluator.

Keep Calculate broad enough to evaluate direct expressions, transformations, quick calculus notation, trig values, logs, numeric forms, and compact validity restrictions. Do not make Calculate the guided owner of derivatives, integrals, limits, periodic/composition analysis, equations, inequalities, or future step-by-step workflows.

The current mismatch is visible guided calculus/workbench routing inside Calculate. Now that Calculus is unified, those guided calculus routes should either move fully to Calculus or become explicit handoffs. Calculate runtime-shell/ticket widening should wait until this surface cleanup happens, so OOE does not harden a blurry workspace boundary.

Recommended Calculate sequence:

1. `CALCULATE-SURFACE1`
2. `CALCULATE-RESTRICTIONS1`
3. `CALCULATE-RUNTIME-SHELL1`
4. Later `STEP-ENGINE0` as a reusable capability, not a Calculate-only feature.
