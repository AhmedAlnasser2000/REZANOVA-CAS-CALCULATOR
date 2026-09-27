# GRAPHING-GPU-FEASIBILITY1 (Graphing Move 27)

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

- Date: 2026-09-27. After reviewing the Codex thread "Review graphing milestone thread" and the Graph code, the user approved the CRITICAL GPU visual-evaluation program (`program-plan.md` in this dossier). It inserts Moves 27-33 and shifts Riemann sheets/surfaces, export, and closeout to Moves 34-37. The user authorized committing each verified move without stopping between gates, working directly on `main`, root-only, with no push.
- Handoff: this program continues Codex's Sep 25-27 Equation.io/GeoGebra investigation (committed research checkpoint `c2b6a156`). Codex remains primary owner of Moves 1-26; Claude Opus 5.5 owns Moves 27+.
- Gate type: backend stop gate. **Outcome: passed.** The packaged WebKitGTK desktop webview has WebGL2 on the NVIDIA RTX 5070 Ti hardware, so the program continues.

## Delivered

- Attribution: user-approved family `opus-5.5` for agent `claude` / model `claude-opus-5-5` in `AGENTS.md`, `.memory/PROTOCOL.md`, and the memory-protocol validator, with a test.
- `src/lib/graphing/renderers/gpu/probe.ts`: a self-contained WebGL2 probe covering renderer, masked-name handling, float targets, GPU timers, highp precision, texture limits, and an RGBA32F field-shader parity check against float64. It is lazily loaded through `renderers/gpu-loader.ts`; `probeGraphWebglCapabilities` is the only public export.
- Settings → Runtime → **Graphics Diagnostics** (`GraphicsDiagnosticsPanel`): a read-only readout of hardware vs software vs masked vs unavailable, renderer, field test, and capabilities, with re-run.
- `tools/graph-gpu/desktop-probe.mjs` (`npm run test:desktop-smoke`): a raw W3C WebDriver client over `tauri-driver` with no new dependency. It injects the same probe into the packaged webview. `--smoke` drives New Graph → `z=x^2+y^2` → 3D and asserts the Three viewport mounts a surface. It runs from a clean environment (SNAP*/LD_* stripped), and `--native-driver` / `--env` are available for diagnosis.
- `tools/graph-gpu/browser-probe.mjs` (`npm run probe:graph-gpu`): the same probe in Chrome hardware ANGLE, Chrome SwiftShader, and Playwright WebKit.
- `tools/graph-bench/` (`npm run test:graph-bench`, non-gating): promotes Codex's ignored `.task_tmp` scripts into a parameterized Calcwiz/Equation.io harness with 11 fixed cases. Renderer-agnostic channels cover sampled-SVG geometry writes, 2D-canvas image draws, WebGL draws, shader compiles, frame p95, and long tasks. Screenshots are kept for separate correctness review.
- Playwright `webkit` project (only `@gpu` specs) and `e2e/graphing-gpu-diagnostics.spec.ts`.
- Roadmap renumbered in the Terra program, authority status lines, and the risk register (new GPU-divergence and desktop-webview-health rows). The user-visible "prepared for Move 28" text was removed.

## Findings

- Chrome hardware: ANGLE NVIDIA RTX 5070 Ti, float targets yes, GPU timers yes, field error 2.9e-7. Chrome SwiftShader: works, error 7.1e-5.
- Packaged desktop (debug build, WebKitGTK 2.52.6): WebGL2 yes, float targets yes, highp 23-bit, **GPU timers no**, field error 2.9e-7, renderer masked as "Apple GPU". Hardware use is proven by the WebKit web process mapping the NVIDIA GL/EGL driver libraries and holding 7 `/dev/nvidia*` descriptors. The Three 3D surface mounts with no SVG fallback, which is the first desktop evidence for the 3D view.
- Root cause of the long-standing blank desktop window: a stale user fontconfig cache (`~/.cache/fontconfig`) hung WebKit's startup font scan, leaving the webview at `about:blank`. Found by bisecting `XDG_CACHE_HOME` subsets. The user approved removing it (and the unrelated 851 MB `WebKitCache` HTTP cache); `fc-cache -f` regenerated it and the app loads with the user's real data. Neither the NVIDIA DMABUF/compositing workarounds nor a matching WebKitWebDriver version were needed.
- WebKit automation works only on debug Tauri builds; a release binary accepts the session but never runs scripts.
- The existing `src-tauri/target` had cached build-script outputs from the old `/home/ahmed/Downloads/Calculator` checkout, which broke `tauri:dev`/`tauri build`. `cargo clean -p` for the six affected packages (both profiles) fixed it.
- Calcwiz baseline (see verification-summary): real 2D zoom gives no resampled geometry during the gesture (first new geometry ≈780 ms after the gesture starts); complex zoom gives its first new tile ≈520 ms and its last ≈760 ms after input (log/pole ≈1140 ms); the 3D orbit holds 16.7 ms p95.

## Limits

- Playwright WebKit cannot launch until `libavif16 libwoff1` are installed (sudo); recorded as an open question.
- Equation.io and GeoGebra comparison runs are deferred to Move 33 by plan; the harness is ready for Equation.io.
- GPU timers are unavailable in WebKitGTK, so adaptive resolution (Move 29) must use rAF frame deltas there.
