# PIECEWISE-CORE1

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Authority and outcome

- Date: 2026-09-30. User-approved plan after a review found piecewise graphing small, approximate and inconsistent. Decisions: piecewise before PTX2; first matching branch wins; restriction braces for y = f(x), x = f(y), polar and parametric curves (implicit and regions wait for PTX4); y, x and polar branches (mixed forms and parametric-in-cases get a clear message); one commit after four gates, no push. Root-only (DIRECT), on `main`; Codex's uncommitted work left unstaged.
- Outcome: **verified** (gates 1–3 backend, gate 4 ui).

## Delivered

- **Gate 1 (backend), conditions solved:** new `sampling/condition-intervals.ts` solves each comparison g = left − right from its PTX roots (exact for polynomials) plus jump and domain-edge points, takes each piece's truth from its midpoint and every boundary's inclusion from the operator (roots) or from g's value there (jumps and edges, snapped to short numbers); interval algebra for and, or, chains, membership and ≠. New condition kinds `or` and `not-equal` (additive contract). The partition is first-match: each branch keeps its condition minus all earlier ones; overlaps become a "shadowed" notice; branch status gains `shadowed`, and `offscreen` / `impossible-global` are told apart by a wide solve.
- **Gate 2 (backend), sampling:** each branch is sampled on its own intervals (dense detail even for a branch narrower than a sample step), paths start and end on vertices evaluated exactly at the boundaries (no chords), end circles are exact (or at the one-sided limit when the branch is undefined there), coinciding open and filled circles draw once, polar branches sample through the polar domain support. Restriction braces `f(x)\{c\}`, `x = g(y)\{c\}` become one-branch piecewise items; parametric restrictions already worked; parametric-in-cases gets its own message.
- **Gate 3 (backend), PTX and Analyze:** `PtxSolverPort.piecewiseFunction` (first-match evaluator); the extremum finder rejects steps and the root finder now rejects jumps (residual must fall to ~0, not merely not grow); Analyze gives piecewise items roots (exact when the branch drawn there has that exact root), extrema, y-intercept, intersections with other curves, and one continuity finding per boundary from one-sided limits (continuous, removable, jump).
- **Gate 4 (ui):** piecewise items trace like their branches (the sweep moves across branch paths), readouts are PTX-verified, traces snap to end circles on arrival (`Endpoint (1, 3)`, `(1, undefined) · limit 1`), holes keep a hollow marker, open circles are rings in the curve's colour, live gesture updates and points of interest include piecewise items, and messages explain shadowed branches, restriction scope, parametric branches, condition variables, and `r`/`θ` used as sliders. The trace-route table moved to `graph-item-routes.ts` (page line cap).

## Deviations and findings

- Continuity findings are `numeric-validated` (one-sided limits), not `exact-proved` as planned for polynomial branches; exact rational comparison at the boundary is left for later.
- Found and fixed: the scene validator accepted only x/y as the piecewise variable, so polar piecewise results were dropped in the app; the root finder reported jumps as roots.
- Existing tests updated for intended behaviour: `or`/`≠` are now supported conditions; coinciding end circles draw once (a filled circle where branches meet continuously, one open circle where both exclude the point).
