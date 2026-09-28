# GRAPHING-GPU-SURFACES3D1 verification

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

## Visual (Chrome and desktop)

- RTX, GPU vs Settings Off (`.task_tmp/graphing-gpu-surfaces3d1/`):
  - `a sin(x)cos(y)`, `sin(r)/r` and `ln(x^2-y)` match the CPU mesh in shape, contours (item colour) and domain;
  - the GPU is smoother, with a per-pixel ramp;
  - the chip reads GPU, or Standard rendering with "GPU rendering is off in Settings".
- Slider drag (a 1 → 3): the mid-drag frame already shows the new amplitude from uniforms; the settled frame re-normalises the ramp and contours.
- SwiftShader: the same three cases render correctly.
- Packaged desktop (WebKitGTK 2.52.6, standalone debug build): `test:desktop-smoke` exit 0.
  - The surface chip reads GPU, with `data-gpu-surfaces=1` and a 384 grid. The `-surface.png` screenshot of the paraboloid was inspected.
  - The complex and real chips still read GPU.

## Performance

- Orbit and slider (`z=a sin(x)cos(y)`, 1440x940), frame avg/p95:
  - RTX, GPU: 17/17 ms orbit, 8/17 ms slider;
  - SwiftShader, GPU: 18/17 ms orbit, 8/17 ms slider after adapting to a 192 grid. Before adaptivity it was 35/50 ms orbit and a 200 ms slider p95.
  - CPU mesh on both: 17/17 ms.
- `test:graph-bench` `surface-paraboloid` orbit on the RTX: 80 frames, p95 16.7 ms, 0 long frames, first WebGL draw 13.8 ms after input, 2 shader compiles (initial only).
- Shader links during a 10-step slider drag: 0 (asserted in e2e). The throttled Graph gate is unchanged: p95 17 ms, 0 long tasks; first preview 167-208 ms is the known open question.

## Automated

- `test:graph-gpu` 51/51 (surface builder, contract, contour step), `test:graph-contracts` 16/16, `test:graph-sampling` 66/66, `test:graph-scene` 11/11, `test:graph-ooe` 51/51, `test:graph-workspace-runtime` 28/28. Boundary ratchet (78 files).
- Full UI suite 611 passed / 4 skipped.
- Playwright chromium 32/33: `graphing-gpu-surfaces`, `graphing-gpu-real-fields`, `graphing-gpu-complex`, `graphing-gpu-parity`, `graphing-gpu-diagnostics`, `graphing-sampler-correctness`, and `graphing-minimum-visible` including the Three controls/picking test. The only failure is the known `:599`.
- `npx tsc -b` clean; scoped ESLint 0 errors (2 existing warnings); `test:file-sizes`, `test:bundle-size`, `test:memory-protocol` and `git diff --check` pass.
- Playwright WebKit remains blocked on host libraries (existing open question).

## Durable memory updated

- `.memory/current-state.md`, `.memory/journal/2026-09/2026-09-28.md`, `.memory/decisions.md`, `docs/architecture/graphing/graph-arc-authority-v1.md`, `docs/architecture/graphing/graph-arc-terra-program.md`, and this dossier.
