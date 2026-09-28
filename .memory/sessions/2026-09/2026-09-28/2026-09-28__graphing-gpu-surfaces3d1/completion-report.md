# GRAPHING-GPU-SURFACES3D1 (Graphing Move 32)

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

- Date: 2026-09-28. Sixth move of the user-approved GPU visual-evaluation program. Root-only, directly on `main`, committed under the standing per-move authorization. No push. Codex's concurrent Integration work was left untouched and unstaged.
- Gate type: ui. Outcome: **verified**. Under Settings Auto, real `z=f(x,y)` surfaces in the 3D pane render in a vertex shader.

## Delivered

- Contract (`contracts/gpu-types.ts`, additive):
  - `real-surface` field items carry `surface: { domain, resolution }`, validated as required for surfaces only, with a positive extent and resolution 2-512;
  - `InteractiveGraphFieldRenderer.getFieldStatus()` reports drawn items and per-item failures.
- `sampling/surface-contours.ts`: one 1/2/5 contour step shared by the CPU contour lines and the GPU iso-bands.
- `renderers/three/gpu-surface.ts`: a unit grid whose `MeshStandardMaterial.onBeforeCompile` shader:
  - evaluates the translated program per vertex, with finite-difference normals;
  - discards triangles touching undefined or |z| > 1e8 vertices, as the CPU does;
  - applies the CPU height ramp (`setHSL`-exact) and 1 px-class contours in the item's stroke colour, width and opacity;
  - keeps lighting, wireframe and selection emissive;
  - takes domain, parameters, range and contour style as uniforms, and swaps geometry only on a resolution change.
  - The program cache key is the program key. Picking is disabled (no-op `raycast`), and `frustumCulled` is off.
- `GraphThreeRenderer` implements the field renderer:
  - GPU surfaces live in their own group (scene updates never dispose them);
  - the CPU mesh and contours stay registered but hidden, as the pick, trace, bounds and focus proxy;
  - height ranges come from the CPU mesh;
  - shader compile errors are attributed through a source marker and return that item to its CPU mesh;
  - adaptive detail steps the grid through 1, 2/3, 1/2, 1/3 and 1/4 when the interval between the first two frames after a render misses 60 Hz, and recovers after 90 on-time frames.
- Shader-program churn removed:
  - the grid is rebuilt only when its signature changes;
  - replaced scene objects are disposed after the new scene renders, so Three keeps shared programs alive instead of relinking on every scene update.
- App:
  - `useGraphSurfaceGpu.ts` does lazy GPU module loading, per-relation cached translation (slider moves never retranslate), a shared 384² vertex budget (≥96 per surface), the float32 domain guard, and reasons;
  - `GraphThreeViewport` sends field frames, shows the `graph-surface-renderer` chip (GPU / GPU n/m / Standard rendering / Precise mode) and `data-gpu-surfaces`;
  - document and setting are threaded through `GraphViewportHost`.
- Authority amendment bullet for surfaces; `e2e/graphing-gpu-surfaces.spec.ts` (`@gpu`); Node tests for the surface builder, contract and contour step; the desktop smoke asserts the GPU surface and saves `-surface.png`.

## Findings

- A render→next-frame probe misreads cost when the render lands late in a frame (frames alternate 17/50 ms). The second-frame interval after a render is reliable: SwiftShader steps to a 192 grid, and the RTX stays at 384.
- Before this move, every 3D scene or presentation update relinked shader programs: the grid was rebuilt, and old materials were disposed before new ones were created. A slider drag now links 0 programs.
- While a slider moves, the ramp and contour spacing use the previous CPU range (documented in the amendment). They normalise when the settled mesh arrives.
- Height colours are slightly more saturated than the CPU mesh because the ramp is evaluated per pixel instead of interpolated across coarse quads. Near domain edges (for example `ln(x^2-y)`) the GPU follows the surface further than the CPU mesh; colour clamps below the CPU minimum.
