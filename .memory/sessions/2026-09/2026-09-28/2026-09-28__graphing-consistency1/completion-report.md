# GRAPHING-CONSISTENCY1 (inserted before Graphing Move 33)

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

- Date: 2026-09-28. The user tested Moves 27-32 by hand and reported input and consistency bugs, then approved a plan (`/home/ahmed/.claude/plans/lets-plan-and-decide-lexical-volcano.md`) with these choices:
  - a per-item complex-values toggle for real curves;
  - a smart auto-switch between views;
  - a GPU heat map for surfaces in 2D;
  - everything in one move.
- Root-only (DIRECT), on `main`, no push. Codex's Integration lane was untouched.
- Gate type: ui. Outcome: **verified**.
- The prior drag-lag fix was committed separately first as `f2b84a6a` (GRAPHING-GESTURE-FRAME-RESET1).

## Delivered

- **Stale complex pane:**
  - The complex GPU hook blanks its canvas on every refused draw, and the overlay canvas clears when there is no tile. A deleted or replaced mapping no longer stays drawn, and the pane no longer looks frozen.
  - The renderer chip is hidden when there is nothing to render.
- **z vs x classification:**
  - `z` beside `x`/`y` in any equation or inequality (e.g. `zx=y`, `y=zx`, `y<zx`) is now `complex-mapping-coordinate-conflict`, with the row message "z is the complex variable and cannot be mixed with x or y. Use f(z) = … for a complex map, or z = f(x, y) for a surface."
  - Previously these were accepted as real curves with an unbound slider `z`, and silently drew nothing.
  - `z = f(x,y)` surfaces are unchanged.
- **Smart auto-switch** (`graph-view-auto-switch.ts`):
  - A newly authored z-mapping in Real opens Complex.
  - Removing the last mapping returns to Real only if Complex was opened automatically.
  - Trajectories `f(t)` never switch; they draw in the Real pane.
  - A user's explicit mode choice ends automatic switching.
  - It applies to edit, delete, blur-delete, undo and redo.
  - A short toolbar notice ("Opened Complex for z" / "Back to Real") with Undo appears; the automatic flag is session-local, not persisted.
- **Opt-in complex values of a real curve:**
  - An optional `complexValues: true` on explicit-y relations (additive schema).
  - A **ℂ** row toggle on y = f(x) rows.
  - The sampler adds principal-branch Re (thin solid) and Im (dashed) paths only on intervals where the value is not real, via the public complex evaluator with `target: 'x'`.
  - New additive stroke roles `complex-real` / `complex-imaginary`; these paths are excluded from trace, and a Re/Im legend appears.
  - The existing z-mapping real-axis slices use the same roles and now break at undefined points.
  - The flag survives re-typing while the item stays y = f(x).
- **UI consistency:**
  - Real/Complex/Both and the complex toolbar groups had no selected state, because their CSS used undefined tokens. They now use the 2D/3D switch's green selected style.
  - The Analyze Style tab is removed (the row swatch opens the same popover). Saved sessions on `'style'` reopen on Features via the session migration; the persisted enum still accepts it.
  - The Complex solve card shows only for a selected z-mapping, and "No supported findings" only when something is selected.
  - The empty-state hint re-centres beside an open Analyze panel.
- **Input field:**
  - The graph placeholders use `\text{…}` ("Enter an expression…" no longer renders as italic math).
  - A row scrolls back to its start on blur.
  - `removeItem` clears a stale selection and sampling priority.
- **2D surfaces:**
  - `z=f(x,y)` in the 2D pane draws as a GPU height map: a one-clause `z − 0` real-field program plus `GRAPH_GPU_SURFACE_HEAT_SHADING`, with the 3D surface's HSL ramp over the CPU mesh range, light iso-contours at the shared CPU contour step, and respect for surface bounds.
  - The SVG bands are hidden while the GPU draws. The CPU mesh stays the trace/Analyze authority.
  - The "Open in 3D" chip was not added, because the viewport's own 2D/3D switch already sits in view.

## Findings recorded

- **Transferred buffers must be owned per path.** The first Re/Im builder shared one `independentValues`/`segmentOffsets` array between two paths; the worker transfer then failed and the whole sample was silently dropped, leaving the old scene. This matches the user's "graph only updates on the next input" symptom for any such failure.
- **Real vanish/duplicate not reproduced.** 12 scripted edit/delete/pan rounds against the dev server and the new e2e case both kept exactly one committed curve per row.
  - The suspected gesture-lane/host supersession stays a hypothesis, so the host was not split.
  - Open question recorded.
