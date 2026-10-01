# PTX3: tracing consistency and regions

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

- Dates: 2026-09-30 (plan) to 2026-10-01. Second of three approved moves (ASYMPTOTE-FIX1, PTX3, PTX-ENGINE1), one commit, no push. The user reported that piecewise, parametric, polar and complex curves lacked roots, intercepts and intersections, and that regions could not be traced. Decisions: new dots are axis crossings, turning points, ends and origin passes (self-crossings deferred); regions get an edge readout saying whether the edge is included, a hover-inside readout with ✓ per condition, and corner dots. Root-only (DIRECT), on `main`; Codex's uncommitted work left unstaged.
- Outcome: **verified** (backend + ui).

## Delivered

- **One curve model** (`ptx/curves.ts`): y = f(x), x = f(y), parametric/polar/trajectory curves (with their parameter range, whether it is a typed restriction, and whether each end is included), and implicit curves. New port methods `curve(source, parameters, window)` (relations, piecewise of one form, complex trajectories z(t) read as (Re, Im)) and `regionEdges(relation)`. `sampling/parametric.ts` exports `graphParametricDomain` so PTX uses the sampler's own t-range and end inclusion.
- **Finders** (`ptx/curve-features.ts`): axis crossings, turning points (horizontal and vertical tangents; for implicit curves F = 0 with Fx = 0 or Fy = 0, classified by the sign of −Fxx/Fy, singular points skipped), ends of restricted curves, polar origin passes, intersections between any two kinds (a path against an equation becomes a root search in the path's parameter; two equations or two parametric curves use a new relative-tolerance 2-D Newton solver `ptxSolvePlaneSystem`), and region corners. Points reached at several parameters (a circle traced over t ∈ [−10, 10]) are reported once, at the parameter nearest 0.
- **Analyze** (`analysis/curve-analysis.ts`): x = f(y), parametric, polar, implicit, inequality and chained-inequality items, complex trajectories and x = f(y) / polar piecewise items report x- and y-intercepts, `turning-point`, `curve-endpoint`, `origin-crossing` and `region-corner` (new additive features) with an optional evidence `detail` (kind, included, parameter), instead of "unsupported". Intersections cover every pair of real curves. Each item now gets a fair share of the time left, so one heavy curve cannot starve the rest.
- **Dots and tracing:** the dots request puts the selected item first and scales its budget with the number of items; one dot per place; open rings for ends and corners not included; complex-roots dots are on the Complex plane. Readouts name each point (`Highest (0, 1) · t = 1.5708`, `Origin (0, 0) · θ = 0.785398`, `Corner (2, 2) · not included`). Region edges trace on their own condition (`(3, 0) · edge of x² + y² ≤ 9, included`), hovering inside a region shows `(x, y) · x < y ✓ · y ≤ 2 ✓` and a click inside selects it; z(t) trajectories trace exactly and read `z = a + bi · t = …`. Conditions are shown as readable text made from the typed LaTeX (`graphLatexText`).

## Deviations and findings

- The piecewise y = f(x) analysis already found roots and intersections; a new browser test confirms dots, roots and intersections on a piecewise curve. Piecewise kinks remain undotted (their branch ends are already snap targets).
- Implicit turning points and two-equation intersections still use finite-difference derivatives and Newton (numeric badge); PTX-ENGINE1 replaces them with AD and interval proofs.
- `tsc -b` currently fails only in Codex's uncommitted `src/lib/symbolic-engine/**` work, so browser checks used `vite build` directly and the desktop build overrode its pre-build command.
