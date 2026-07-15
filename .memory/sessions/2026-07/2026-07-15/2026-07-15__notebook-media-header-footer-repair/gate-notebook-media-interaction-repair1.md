# `NOTEBOOK-MEDIA-INTERACTION-REPAIR1` — UI Gate

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

## Delivered

- Kept the V10 snap-and-wrap contract while making the measured media rectangle the single geometry for content, outline, and eight handles. Resize previews stay pixel-local and pointer release commits one percentage/ratio transaction; Escape leaves History unchanged.
- Image corners preserve the displayed ratio, image side handles stretch one dimension, crop remains source-relative with the 10% visible-area floor, rotation remains whole-degree with Shift snapping, and Reset proportions restores the source ratio without changing width.
- Every video handle preserves the decoded source ratio. New video insertions persist the inspected ratio; older nodes receive one non-History decoded-ratio correction that autosave persists. Video rendering uses `object-fit: contain`.
- Separated inline, theater, and fullscreen presentation states. Theater covers the active Notebook workspace while preserving the outer Workspace Tabs; fullscreen covers the viewport with only the player. One mounted video element retains current time across transitions.
- Moved playback controls into a bottom overlay and added the 2.5-second inactivity policy while playing. Embedded MP4/WebM audio remains on the existing video element and defaults to unmuted full volume; mute and volume remain session-only.

## Evidence

- `npx vitest run src/app/shell/notebook/canvas/NotebookDirectMediaInteraction.test.ts` — 10 passed for image corner/side behavior, all video handle directions, and minimum/maximum bounds.
- `npx vitest run --config vitest.ui.config.ts src/app/shell/NotebookPage.ui.test.tsx` — 30 passed for NodeView behavior, insertion ratio, presentation state, Escape, and persistence.
- `npx playwright test e2e/notebook-video.spec.ts --project=chromium` — 1 passed with the real VP9/Opus fixture: source-ratio side resize, bounded overlay controls, unmuted volume 1, auto-hide/focus recovery, theater above the ribbon with outer tabs preserved, and a distinct 2400 by 1050 fullscreen surface. The final theater and fullscreen screenshots were inspected.
- `npx playwright test e2e/notebook-image.spec.ts --project=chromium -g "inserts and directly manipulates"` — 1 passed after an unrelated shared-dev-server reset during a combined run. Focused image evidence covers side stretch, width-preserving Reset proportions, crop, rotation, and forced-color handle geometry.
- Notebook-scoped ESLint and `git diff --check` pass. The touched production files remain below 1,000 lines and `NotebookPage.ui.test.tsx` remains at 1,499 lines.

## Shared-Tree Blockers

- Incremental TypeScript currently stops only in concurrent `catalog-linear-numeric-decomposition.ts` / `catalog.ts` readonly `modeVisibility` changes outside the Notebook lane.
- The file-size ratchet currently stops only because concurrent `src/types/calculator/runtime-types.ts` has 1,341 lines against its 1,340-line cap.
- Fresh packaged-Linux automation could not run because neither `tauri-driver` nor `WebKitWebDriver` is available in the current environment. The committed predecessor gate already proved packaged WebKitGTK VP9/Opus decode, range seeking, and audio-capable playback; this gate's changed presentation geometry is freshly verified in Chromium and is not misreported as fresh native evidence.

## Commit

- Candidate scope is limited to Notebook media source/tests/styles and required durable-memory files.
- Explicit user approval is required before the selective commit. No push is authorized.
