# GRAPHING-GPU-REAL-FIELDS1 (Graphing Move 31)

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

- Dates: 2026-09-27 to 2026-09-28. Fifth move of the user-approved GPU visual-evaluation program. Root-only, directly on `main`, committed under the standing per-move authorization. No push. Codex's concurrent Integration work was left untouched; it landed separately in `3a96622c`.
- Gate type: ui. Outcome: **verified**. Under Settings Auto, the GPU draws real implicit equalities, inequalities and chained inequalities. Formula curves stay on SVG but refresh during gestures.

## Delivered

- `renderers/gpu/real-field.ts`: clause programs (up to 4), with inside meaning ≤ 0 exactly as the CPU implicit sampler defines it. Rendering is two passes:
  - **Pass 1** writes clause values into an RGBA32F target, with a 1e30 undefined sentinel.
  - **Pass 2** draws a boundary only where a finite neighbour shows a real sign change. It is anti-aliased by |F|/|∇F|.
  - A two-scale slope-consistency test rejects pole crossings (1/x, tan).
  - Chained clauses count only where the other clauses hold.
  - Strict clauses and dashed/dotted strokes use a tangent phase, and a luminous halo is supported.
  - Region fill uses premultiplied blending.
  - Pixels beyond stroke and halo reach skip the neighbourhood search, so the output is unchanged and the SwiftShader frame drops from 84 to 29 ms.
- `real-program.ts` gains named functions and shared parameter lists.
- `field-layer.ts` gains:
  - cached float targets, sampler inputs, blending and `clear`;
  - a GPU timer frame bracket;
  - `presentLatencyMs`, the delay from a draw to the next animation frame, used where timer queries are missing (WebKitGTK, SwiftShader, most browsers);
  - compile/link logs in failure reasons;
  - `preserveDrawingBuffer` for multi-pass layers;
  - one-time float-target completeness checks.
- `policy.ts` `graphGpuFrameCostMs`: the adaptive scale reads timer time when available, otherwise present latency. A missed 60 Hz frame scales down, a vsync-paced frame recovers, and a band in between holds steady.
- SVG renderer split into grid SVG, GPU slot and geometry SVG:
  - suppressed item paths for GPU-drawn items;
  - a gesture path group that replaces stretched committed curves during gestures.
- `useGraphRealFieldGpu.ts` covers candidate programs, presentation parity, the precision guard, adaptive scale, and per-item fallback with visible reasons. A draw or compile failure returns that item to SVG.
- `useGraphGestureSampling.ts` is a latest-only preview sampling lane for explicit, polar and parametric curves. It runs through the ordinary OOE worker path with its own sequence. Scenes are pushed to the renderer through a subscription and never through React state.
- `GraphSvgViewport`:
  - GPU draw and throttled lane requests in `renderView`;
  - freeze on settle, cleared by the committed scene;
  - a renderer chip (`graph-real-renderer`) showing GPU / GPU n/m / Standard rendering / Precise mode with reasons. It sits above the Polar-grid suggestion when both are shown.
- `MathEditor` (shared) reads its callbacks through a latest-value ref, so a parent re-render no longer reconfigures every math field. Before, each Graph re-render made MathLive re-typeset and reflow all rows, roughly 0.8 s of main-thread work per short gesture with 25 rows.
- Tests and tooling:
  - `e2e/graphing-gpu-real-fields.spec.ts` (`@gpu`): in-app GPU draws and gesture lane, plus tan pole rejection by pixel read-back;
  - `real-field.test.ts` and the frame-cost policy test;
  - the desktop smoke real-field check and screenshot;
  - benchmark counting of gesture-path writes.

## Findings

- WebKitGTK 2.52 presents nothing from a multi-pass WebGL canvas (offscreen target, then canvas) unless `preserveDrawingBuffer` is true. With it, the desktop app draws the GPU circle.
- The throttled Graph performance gate first regressed on this move (p95 frame 283 ms, 130-215 ms tasks). Profiling found three causes, all fixed:
  - full-resolution software-GL fields with no timer to trigger adaptive scale;
  - gesture-lane React state re-rendering the whole page;
  - the MathEditor reconfiguration above, which predates this move.
- After the fixes, p95 is 17 ms with zero long tasks. Only the first-preview budget failure recorded before this program remains.
- The user's hard scene (`x^y=y`, `y^{sin y}=sin(fx+c)` with sliders, formula curves) at 1440x940 in unthrottled headless Chrome runs at a 17 ms p95 with no long tasks, on the RTX and SwiftShader, before and after this move. So the lag the user reports in the desktop app is specific to WebKitGTK and the machine state. MathLive reconfiguration, the page re-renders during sampling, and settle-time CPU implicit sampling are the likely costs there. This is recorded as an open question for Move 33's matched desktop benchmark.
