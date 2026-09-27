# GRAPHING-GPU-COMPLEX2D1 verification

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

## Visual (Playwright and desktop)

- Real app, Chrome on the RTX 5070 Ti (1440x940). Screenshots in ignored `.task_tmp/graphing-gpu-complex2d1/` were inspected:
  - `log(z-1)` is crisp at full resolution, with the dashed cut ending at z=1 and the colour wheel converging at the zero z=2;
  - mid-zoom stays sharp;
  - the component maps have per-quadrant cuts;
  - the accessible palette renders;
  - `z^3/(z^2+1)` shows the triple zero and poles at ±i clearly, while GPU Off shows the old blocky tile;
  - the chip reads GPU / Standard rendering with reasons.
- Trace at z=4+2.4i reads w=1.346+0.6747i (exact `log(3+2.4i)`). No console errors after the wheel fix.
- Headless Chromium (SwiftShader) `gpu-complex-mid-gesture.png`: crisp while the CPU tile is still running.
- Packaged desktop (WebKitGTK 2.52.6 under Wayland, debug binary with Vite): `test:desktop-smoke` exit 0. WebGL2 and field precision pass, the Three 3D surface mounts, and the complex chip reads GPU. The WebDriver screenshot was inspected (crisp domain colouring in the desktop app).

## Automated

- Playwright chromium, 5/5:
  - `graphing-gpu-complex.spec.ts` (≥6 GPU draws during an 8-step gesture, no mid-gesture CPU tile, exact trace, fallback reason, stale trace cleared);
  - `graphing-gpu-parity`, `graphing-gpu-diagnostics`;
  - `graphing-sampler-correctness` 2/2.
- `graphing-minimum-visible.spec.ts`: 24 passed and 1 failed. The failure is the pre-existing piecewise Add Item focus check already recorded on `main`.
- Benchmark (`test:graph-bench`), complex zoom on RTX and SwiftShader: 12-13 GPU draws during a 12-step gesture, the first ≈37-44 ms after the gesture starts (baseline: first new image ≈500 ms), 0 shader compiles, 0 new CPU tiles mid-gesture, 0 long tasks.
- Unit and UI suites:
  - `test:graph-gpu`, `test:graph-sampling` 65/65;
  - UI `src/app/graphing` plus Settings 44/44;
  - boundary ratchet (75 files).
- Checks:
  - `npx tsc -b`: no errors in this move's files;
  - scoped ESLint, `test:file-sizes` (GraphWorkspacePage 931), `test:bundle-size`, `test:memory-protocol`, and `git diff --check`: all pass.
- Processes started by this gate (Vite dev, preview, tauri-driver, app) were stopped.

## Durable memory updated

- `.memory/current-state.md`, `.memory/journal/2026-09/2026-09-27.md`, `.memory/decisions.md`, `.memory/open-questions.md`, `docs/architecture/graphing/graph-arc-terra-program.md`, and this dossier.
