# `NOTEBOOK-VIDEO-PLAYBACK-SHELL1` — UI Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: gate4_video; gate4_audit; gate4_native_video; gate4_final_review
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Delivered

- Replaced native browser controls with an accessible Notebook control bar for play/pause, elapsed and duration, seeking, mute and volume, captions, theater mode, and fullscreen.
- Kept one mounted video element while changing theater/fullscreen presentation, preserving the resolved local/ranged source and the current playback position.
- Kept theater inside the active Notebook workspace. Browser fullscreen uses the presentation container; the desktop path uses the narrow `core:window:allow-set-fullscreen` capability and Tauri's current-window API.
- Escape, browser fullscreen changes, and unmount restore presentation state. A request-owned entry lock prevents an escaped or stale fullscreen request from clobbering a later transition. Direct media resize and drag controls stay hidden while a video is presented.
- Playback decode/start failures retain the mounted video and show a readable poster-backed error surface instead of a black player.
- Kept playback state session-only, existing WebVTT/loop behavior, and inactive-tab unmount cleanup. No document contract, persistence, asset-server, or app-state change was introduced.

## Coordination

- `gate4_video` implemented the focused NodeView, CSS, test, and capability slice.
- `gate4_audit` constrained the work to the existing NodeView, range-delivery, and active-surface lifecycle seams.
- `gate4_native_video` exercised the final packaged WebKitGTK desktop player without changing tracked source.
- `gate4_final_review` performed a final scoped source review before the checkpoint.

## Evidence

- `npx vitest run --config vitest.ui.config.ts src/app/shell/NotebookPage.ui.test.tsx --maxWorkers=4` — 30 passed, including custom controls, caption selection, volume, retained mounted element after error, theater/Escape, browser fullscreen, direct-control suppression, and stale-fullscreen-request cancellation.
- `npx playwright test e2e/notebook-video.spec.ts --project=chromium --workers=1 --reporter=list` — 1 passed. The real WebM scenario covered custom controls, seek, captions, theater/Escape, 2400px, 1440px, 1100px, 80% scale, and 130% forced-colors containment; normal, theater, and forced-colors screenshots were inspected.
- Scoped ESLint, capability JSON parsing, and `git diff --check` passed. The Notebook files remain within their ratcheted size caps; current global `npm run test:file-sizes` stops only because concurrent `src/lib/guide/content/selectors.ts` is 2,533 lines against its 2,528-line cap.
- The focused incremental TypeScript check passed before concurrent source advanced. The current shared-tree `npx tsc -b --pretty false` stops only in concurrent `vector-geometric.ts` detail-evidence typing and its MathJSON-coverage baseline; the earlier global lint/Vite failures were likewise outside Notebook playback files.
- `cargo build --manifest-path src-tauri/Cargo.toml` passed for the rebuilt desktop fullscreen capability. Final packaged WebKitGTK evidence passed with the real WebM through the opaque Rust loopback URL: ready state 4, duration 1.008 seconds, custom controls present and native controls absent, seek to 0.6 seconds with one seekable range, theater and desktop fullscreen/Escape, a deliberate double-fullscreen press, and exactly one mounted video node. The session, app, and both drivers were stopped afterward.

## Commit

- Standing user approval for this named gate was recorded on 2026-07-14.
- Candidate scope contains only the Notebook video NodeView, its focused UI/Chromium tests, one Tauri window permission, styles, and the required durable-memory updates. Unrelated Linear Algebra/Statistics work and untracked `test-results/` remain excluded.
