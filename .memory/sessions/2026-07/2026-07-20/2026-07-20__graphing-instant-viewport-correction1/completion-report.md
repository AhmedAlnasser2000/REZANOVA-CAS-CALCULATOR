# GRAPHING-INSTANT-VIEWPORT-CORRECTION1 completion report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Completed implementation gate

- gate: `GRAPHING-INSTANT-VIEWPORT-CORRECTION1`
- gate_type: ui
- date: 2026-07-20

## Delivered

- Separate imperative `setView` and `setScene` renderer operations, live main-thread grid generation, stable keyed SVG layers, and one settled React viewport commit per gesture.
- Geometry-only `GraphSampleRequestV2`, retained cooperative worker supersession, and stale-buffer release without worker churn.
- Click-first tracing that selects the closest screen-space curve point and then sweeps the selected item; keyboard/touch routes remain available.
- Discoverable `+ Add item` creation for Piecewise Function and Point Set, with session-owned incomplete piecewise drafts and atomic structured promotion.
- Iterative screen-space explicit/parametric refinement without a generic depth cutoff, including finite/non-finite boundary remainder preservation so ordinary branches reach viewport edges.
- Overflow-only horizontal scrolling inside expression content while visibility/delete/editor actions remain fixed.

## Manual verification

1. Enter `x` and `sin(x)`, click either curve from above or below, and confirm the marker begins at the point closest to the cursor; move continuously and confirm it stays on that selected curve.
2. Scroll and drag rapidly; confirm the grid follows immediately, geometry transforms without dimming or blue selection, and tracing hides then returns only after current geometry settles.
3. Select Polar grid, move the origin offscreen, and confirm rings, spokes, axes, and restrained labels continue to cover the live viewport.
4. Use `+ Add item -> Piecewise Function`; confirm a blank two-branch builder opens, incomplete drafts do not plot, and a fully valid set promotes atomically.
5. Enter `log(sin(x))`, zoom to show several branches, and confirm rounded maxima plus continuous descent to the viewport edge without cuts or polygonal caps.
6. Enter a long piecewise expression; confirm only the expression area scrolls horizontally when necessary and the scrollbar has space below the mathematics.

## Deferred prerequisite

- The full viewport/zoom/workload-adaptive sampling policy is intentionally not hidden inside Move 15. It is dedicated Move 16 and must pass the retained mixed workload before Move 17 Three.js.

## Durable memory updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-07/2026-07-20.md`
- this session dossier

## Commit posture

- The user approved the Move 15 commit. No push is authorized.
