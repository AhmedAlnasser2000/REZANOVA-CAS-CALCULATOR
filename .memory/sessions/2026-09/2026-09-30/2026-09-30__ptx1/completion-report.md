# PTX1

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

- Date: 2026-09-30. User-approved plan: PTX ("point tracing extreme") owns traced points and points of interest and their certainty; Desmos-style dots for the selected item; snapping only on arrival (about 6 px), never pulling from a distance; honest digits plus an exact / verified / numeric badge; Analyze uses the same finders; Equation (and its interval arithmetic) will be rebuilt later, so PTX reaches solvers only through a replaceable port. Root-only (DIRECT), on `main`, three commits, no push.
- Gate type: ui. Outcome: **verified**.

## Delivered

- **PTX-CORE1** (`af3f273b`): `src/lib/graphing/ptx/` with the solver port and its current adapter (enforced by a new graphing-boundary-ratchet rule), refiners (exact explicit evaluation, Newton projection with a branch-cut jump check, screen-space stepping), honest-digit readouts and badges, and finders for roots (exact polynomial roots, bracketed roots that reject poles, touching roots), extrema and intersections (tangential and complex-locus crossings). Analyze now uses the PTX finders.
- **PTX-COMPLEX1** (`5c64c9da`): tracing in the Complex pane (click-to-pick loci and roots, sweep along the true curve, arrow stepping, Escape; pinned z-map probe that drops when its map changes and warns near a branch cut), locus-intersection dots with snap on arrival, points of interest from their own analysis worker, and the traced point mirrored in the Real pane in Both mode.
- **PTX-REAL-POI1** (the commit adding this dossier): grey dots for the selected Real item (roots, extrema, intersections, y-intercept) with a hover readout; traces of explicit curves read exact f(x) and implicit curves are projected onto the true curve; snap on arrival names the point ("Intersection (1, 1)"); Shift+Arrow jumps between dots; the callout carries the badge. Items PTX cannot refine yet (piecewise, parametric, polar) keep their sampled readout with a "not refined" numeric badge.

## Deviations and findings

- The locus readout's second line shows |z| and arg z instead of re-evaluating the clause sides (the clause is satisfied by construction to the stated error).
- The first dots implementation re-ran its worker request on every render (a new workspace-context object each time) and so never finished; fixed by depending on the workspace id.
- The first pinned-probe implementation could show a stale w after the expression changed; pins now carry their source and drop when it changes (caught by the GPU complex spec).
- The equal-axes squaring can land after a test reads the view; the minimum-visible tracing helper now waits for a stable viewport.
- Follow-ups: PTX for piecewise, parametric and polar traces, 3D (PTX3) and inequalities (PTX4); a clearer message when `r` (the polar radius) is used as a slider in a Cartesian relation.
