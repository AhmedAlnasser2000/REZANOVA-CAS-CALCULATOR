# GRAPHING-GPU-COMPLEX2D1 (Graphing Move 30)

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

- Date: 2026-09-27. Fourth move of the user-approved GPU visual-evaluation program. Root-only, directly on `main`, committed under the standing per-move authorization. No push. Codex's concurrent Integration work (`src/lib/symbolic-engine/integration/core/*`) was left untouched and unstaged, per the user.
- Gate type: ui. Outcome: **verified**. The complex 2D pane renders on the GPU by default (Settings Auto).

## Delivered

- `renderers/gpu/complex-shading.ts`: GPU domain colouring (standard and accessible palettes) and the 2x2 component maps. It reproduces the CPU palettes exactly; component scales come from the last CPU tile. The field layer gains shading uniform declarations and integer uniforms.
- `app/graphing/useGraphComplexGpu.ts`:
  - lazy GPU module, whitelisted complex translation, field layer lifecycle;
  - per-frame draws from the live viewport, the adaptive render scale, and the float32 precision guard ("Precise mode");
  - explicit CPU-fallback reasons: setting off, unsupported operator, unbound parameter, CPU evaluator unsupported (so the GPU never draws what the CPU authority cannot), WebGL2 unavailable, context lost, and starting.
- `GraphComplexViewport`:
  - the GPU canvas sits under the 2D overlay canvas, which draws cuts and labels only (or the full CPU tile when falling back);
  - a renderer chip (GPU / Standard rendering / Precise mode) with its reason in the title;
  - branch cuts are drawn inside each component quadrant (previously one line spanned the whole 2x2);
  - wheel handling uses a native non-passive listener (React's passive `onWheel` could not prevent page scrolling);
  - trace evaluates the public complex evaluator at the exact cursor point via the lazily loaded `loadGraphComplexTraceEvaluator`, and a stale trace clears when the expression or parameters change.
- `graphGpuRendering` is threaded ActiveSurfaceHost → GraphWorkspacePageHost → GraphWorkspacePage (optional, default `auto`) → GraphComplexViewport.
- `e2e/graphing-gpu-complex.spec.ts` (`@gpu`); the desktop smoke gains the complex GPU chip assertion and a WebDriver screenshot; the benchmark and sampler specs target the labelled overlay canvas.

## Findings

- Desktop blank-window diagnosis (continued from Move 27):
  - A newer fontconfig bundled in another program (likely Chrome, launched repeatedly by the benchmarks) replaced all 47 `~/.cache/fontconfig/*cache-9` files with symlinks to `cache-12`, a format the system fontconfig 2.15 used by WebKitGTK does not write. With the user's permission these were removed and regenerated.
  - Separately, `npm run tauri:dev` rebuilds `src-tauri/target/debug/calcwiz_desktop` as a dev binary that loads `http://localhost:1420`. Without Vite running it retries forever on a blank `about:blank` window; strace showed ~1,000 connects to 1420 in 12 s.
  - Under the user's switch to Wayland, with Vite running, the app renders and the desktop smoke passes.
- WebKitGTK renders the Graph theme `<select>` with a light background and low-contrast text (pre-existing; recorded as an open question).
