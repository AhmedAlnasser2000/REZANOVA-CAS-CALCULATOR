# `NOTEBOOK-MEDIA-INTERACTION-REAUDIT2` — UI Audit

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Gate State

- status: verified
- behavior changes: none
- foreground Chromium evidence: complete
- packaged Tauri/WebKitGTK evidence: complete

## Confirmed Source-Level Failures

- Resize preview still writes React state on pointer movement through `setPreview`; the document is not mutated during movement, but the render path remains coupled to React reconciliation instead of a dedicated frame loop.
- Resize geometry returns width/height while `interactionFrame` pins preview `left`/`top` to the initial frame. West/north/corner handles therefore cannot truthfully follow their pointer anchor.
- Width is rounded to an integer percentage both when the initial preview is formed and during resize/rotation commits, making visible release quantization possible.
- All eight resize handles are always rendered for images and videos even when their semantics are misleading for the current alignment/wrap mode.
- The selection controls are nested under the media transform shell while the figure itself can retain a broader flow box; this is consistent with the reported outline/handle mismatch.
- Wrapped image and video CSS still imposes a hidden `max-width: 52%`, which can disagree with persisted `widthPercent` and the page-layout fallback helper.
- Media repositioning still selects left wrap, right wrap, or normal flow from horizontal thirds of the stage. It does not follow document insertion targets or provide arbitrary X/Y placement.
- Video theater/fullscreen remains owned inside `NotebookVideoNodeView` and its clipped/scaled Notebook hierarchy. Desktop fullscreen reports success after `setFullscreen(true)` without reading back actual window state.
- Video metadata discovery can still write `displayAspectRatio` back into the document after load with `addToHistory: false`, causing hidden post-open document mutation.
- Canvas media drag, Outline drag, and structured-block movement remain separate interaction paths.

## Existing User Evidence Revalidated

- `Screenshot from 2026-07-15 02-41-34.png` shows a selected video whose eight resize handles surround only a small video frame while the selected figure outline spans almost the full available row. Playback controls sit below the measured media instead of inside one coherent frame.
- `Screenshot from 2026-07-15 02-42-10.png` shows the supposed fullscreen player still composited with Notebook ribbon, page content, Inspector, and outer workspace chrome. The media is cropped into a large black surface rather than presented as a viewport-owned player.
- `Screenshot from 2026-07-15 02-42-49.png` shows an image whose selected outline is a wide horizontal strip while the visible image and clustered handles occupy only a small center rectangle.
- `Screenshot from 2026-07-15 02-43-05.png` shows the same image stretched into a tall frame with mismatched proportions, confirming that current handle behavior can create extreme distortion rather than a stable proportional resize.
- These screenshots support the source diagnosis, but they do not replace the pending scale-by-scale pointer measurements or fresh packaged-native proof.

## Foreground Chromium Measurements

- The current four-case image/video Playwright suite passed in 19.5 seconds. That pass is a false-green baseline: the assertions only prove broad size/class changes and do not measure pointer truth or preview/commit parity.
- A dedicated foreground probe measured image and video west-handle drags in both Print and Draft at 80%, 100%, and 130% page UI scale.
- For a 73.4 CSS-pixel drag, image preview handle separation ranged from 25.478 to 44.041 pixels. Release separation ranged from 23.494 to 50.166 pixels.
- Image preview-to-release frame discontinuity reached 49.391 pixels. This fails the locked maximum of 2 pixels.
- Video preview handle separation ranged from 44.119 to 73.4 pixels. At 100% and 130% in Print and at every tested Draft scale, the west handle did not follow the pointer at all.
- Video release separation reached the complete 73.4-pixel pointer travel. Preview-to-release discontinuity reached 48.984 pixels.
- Video frame/figure width disagreement reached 35.438 pixels before manipulation. The current eight-handle UI is therefore attached to different geometry than the visible/flow media in affected layouts.
- The retained screenshots at 2400, 1440, and 1100 pixels, 80%/130% scale, and forced colors were inspected. The crop/rotation image evidence and selected video evidence visibly confirm the measured rectangle and handle mismatch.

## Packaged Tauri / WebKitGTK Evidence

- Fresh WebKitGTK automation used `tauri-driver` 2.0.6 and user-local `WebKitWebDriver` 2.52.3 against the current debug package and Vite surface.
- The local WebM decoded at ready state 4, reported duration 1.008 seconds, used the opaque loopback capability URL, exposed one seekable range, and sought to 0.6 seconds.
- Inline geometry was internally inconsistent: the presentation/selection frame measured 60.172 pixels wide while the video frame measured 85.344 pixels and the decoded video 83.344 pixels. Eight handles still rendered around the smaller interaction frame.
- Theater kept the outer workspace tabs visible and covered the active Notebook workspace. One video element remained mounted and current time remained 0.6 seconds.
- Desktop fullscreen readback returned `true`; the presentation covered the 2560 by 1440 viewport and did not retain the theater class. Escape returned to the prior theater state and native fullscreen readback returned `false`.
- The basic native state transition therefore works in this current checkout, but it does not erase the user-reported clipped presentation failure or the source ownership problem: the authoritative player still lives inside the page NodeView hierarchy. The dedicated presentation-host gate remains required.
- Directly assigned session volume 0.4 had returned to 1 by presentation measurement. Volume preservation must be retested through the real control surface in the presentation-host gate.
- Actual speaker-output proof with audible MP4/AAC and WebM/Opus remains a closeout requirement for the presentation-host gate; metadata and unmuted state alone are not claimed as audible proof.

## Evidence Artifacts

- `.task_tmp/notebook-direct-manipulation-floating-program/browser-geometry-audit.json`
- `.task_tmp/notebook-direct-manipulation-floating-program/browser-baseline/`
- `.task_tmp/notebook-direct-manipulation-floating-program/native-audit.json`
- `.task_tmp/notebook-direct-manipulation-floating-program/native-baseline/`
- Temporary evidence remains ignored and is not product/runtime input.

## Gate Conclusion

- Gate 0 is verified as an audit, not as a product pass.
- Current direct media fails pointer truth, preview-to-commit parity, video geometry ownership, and scale consistency by large measurable margins.
- Schema 12 geometry repair may begin. It must establish one full rectangle and coordinate-space policy before gesture code is changed.
- Only the Vite, `tauri-driver`, WebKitWebDriver, Tauri session, and Calcwiz window started by this audit were stopped. Foreign long-running test/debug processes were left untouched.

## Tooling Readiness

- `tauri-driver` 2.0.6 installed under the user Cargo toolchain.
- Ubuntu `webkit2gtk-driver` 2.52.3 extracted under the user-local toolchain and resolves as `WebKitWebDriver`.
- Existing foreign Vitest/debug processes and the shared Playwright test-server process are not owned by this Notebook gate and must not be stopped.
