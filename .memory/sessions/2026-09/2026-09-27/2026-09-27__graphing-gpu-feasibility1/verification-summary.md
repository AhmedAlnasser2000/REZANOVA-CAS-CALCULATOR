# GRAPHING-GPU-FEASIBILITY1 verification

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

## Gate

- Type: backend stop gate. Stop condition: the packaged app lacks hardware WebGL2. **Not triggered.**

## WebGL2 probe evidence

| Environment | WebGL2 | Renderer | Float RT | GPU timers | highp | Field error |
|---|---|---|---|---|---|---|
| Chrome 1.58 hardware ANGLE | yes | ANGLE NVIDIA GeForce RTX 5070 Ti, OpenGL 4.5 | yes | yes | 23-bit | 2.9e-7 |
| Chrome SwiftShader | yes | ANGLE SwiftShader (software) | yes | yes | 23-bit | 7.1e-5 |
| Packaged Tauri debug build, WebKitGTK 2.52.6 | yes | masked ("Apple GPU") | yes | **no** | 23-bit | 2.9e-7 |
| Playwright WebKit | blocked: host lacks `libavif16 libwoff1` | | | | | |

- Hardware proof for the masked desktop renderer: while the release app ran, its `WebKitWebProcess` mapped 12 NVIDIA GL/EGL driver library regions and held 7 `/dev/nvidia*` descriptors. The field error matches the RTX Chrome result, not SwiftShader.
- `node tools/graph-gpu/desktop-probe.mjs --smoke --binary <debug build>` exit 0. Graph New Graph → `z=x^2+y^2` → 3D: `data-ready=true`, one surface mesh, no `.graph-renderer-fallback`. Failures list empty.
- The first desktop runs hung because the webview never left `about:blank`. Bisecting `XDG_DATA_HOME`/`XDG_CACHE_HOME` with copies isolated a stale `~/.cache/fontconfig`. With user approval it was removed and regenerated (`fc-cache -f`), and the real app now loads with the user's data. Screens are kept under ignored `.task_tmp/graphing-gpu-feasibility1/`.

## Calcwiz baseline (`npm run test:graph-bench`, 1440×940, DPR 1)

The table shows p95 frame ms, then `during input / first ms / last-after-input ms` for sampled SVG geometry writes (S) and complex canvas image draws (C), then WebGL draws and shader compiles during the gesture. Hardware and SwiftShader match within noise because every current Graph pixel is CPU-evaluated.

| Case | p95 | S | C | GL/compiles |
|---|---|---|---|---|
| polynomial | 16.7 | 0 / 790 / 662 | — | 0/0 |
| rational | 16.7 | 0 / 786 / 660 | — | 0/0 |
| log-root | 16.7 | 0 / 791 / 660 | — | 0/0 |
| implicit-circle | 16.8 | 0 / 801 / 716 | — | 0/0 |
| implicit-hard-power | 16.8 | 0 / 790 / 709 | — | 0/0 |
| implicit-hard-mixed-power | 16.8 | 0 / 792 / 699 | — | 0/0 |
| implicit-hard-nested-log | 16.8 | 0 / 799 / 692 | — | 0/0 |
| inequality | 16.8 | 0 / 788 / 660 | — | 0/0 |
| complex-quadratic | 16.7 | — | 0 / 502 / 756 | 0/0 |
| complex-log-pole | 16.7 | — | 0 / 622 / 1081 | 0/0 |
| surface-paraboloid (orbit) | 16.8 | — | — | 6828/2 |

- Real 2D: zero resampled geometry during zoom; the first new geometry arrives about 790 ms after gesture start. Complex: zero new tiles during input; first ≈500-620 ms, last ≈760-1080 ms after input, matching Codex's Sep 25 measurement. 3D orbit is already GPU-drawn at 60 Hz.
- Correctness screenshots are saved per case for Move 28/31 review, never judged from timings.

## Checks

- `node --test tools/validate-memory-protocol.test.mjs`: pass, including the new Opus 5.5 case.
- `npx tsc -b`: pass. Scoped ESLint over the new and changed TS/MJS files: pass.
- `node tools/graphing-boundary-ratchet.mjs`: pass (65 production files).
- `npm run test:graph-contracts`: 13/13. `vitest.ui` `SettingsPage.ui.test.tsx` 4/4 and `GraphicsDiagnosticsPanel.ui.test.tsx` 3/3.
- Playwright `e2e/graphing-gpu-diagnostics.spec.ts` (chromium): pass. Visual check of the card: readable, no overflow; headless Chromium correctly reports "Software rendering" (SwiftShader) with error 7.1e-5 in 10.2 ms. The WebKit project is blocked by the missing host libraries.
- `npm run build` and `npm run test:bundle-size`: pass. The probe ships only in its lazy `probe-*.js` chunk; the eager `index-*.js` chunks contain none of it.
- `npm run test:file-sizes`: pass. `npm run test:memory-protocol`: pass. `git diff --check`: pass.
- Environment repairs outside the repo, all user-visible and approved or regenerable:
  - Playwright headless Chromium 1208 reinstalled (the repo pin; the Equation.io mirror had left only 1243);
  - WebKit 2248 installed;
  - `cargo clean -p` for six Tauri packages in `src-tauri/target` (debug + release);
  - a matching WebKitWebDriver 2.52.6 extracted to ignored `.task_tmp` (not needed in the end).
- All tauri-driver, WebKitWebDriver, app, and preview processes started by this gate are stopped.

## Durable memory updated

- `.memory/current-state.md`, `.memory/journal/2026-09/2026-09-27.md`, `.memory/decisions.md`, `.memory/approvals.md`, `.memory/open-questions.md`, `.memory/closed-questions.md`, `.memory/PROTOCOL.md`, and this dossier (`program-plan.md`, `completion-report.md`, `verification-summary.md`, `commit-log.md`).
