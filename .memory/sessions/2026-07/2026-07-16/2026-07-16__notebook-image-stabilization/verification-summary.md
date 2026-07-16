# NOTEBOOK-IMAGE-STABILIZATION1 — Verification Summary

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Scope

- Gate type: ui
- Stabilized current image-only Notebook authoring after video removal.
- Kept the recut boundary: no video UI restoration and no resumed floating-pagination implementation.
- Preserved unrelated Linear Algebra, Calculus/result-contract, and `test-results/` work.

## Changes verified

- Image insertion remains immediate, uses the safe image validation/asset path, and creates no forced caption prompt.
- Caption, alt text, decorative state, and figure numbering remain explicit Picture Format actions on a selected image.
- Selected image handles are stable and expose measurement hooks for regression tests.
- Direct image resizing persists point dimensions and keeps the selected shell/handles aligned to the visible image after downsizing.
- Point-sized images now size the transform shell directly from `displayWidthPt`/`displayHeightPt` instead of capping the shell through the old percentage-width path.
- Width-only image resizing now renders the bitmap through a source-ratio stretch stage, so a deliberately distorted object box does not show horizontal letterboxing from the source image's intrinsic aspect ratio.
- Width-only downsizing now sizes the outer image figure itself, not only the inner transform shell, and the generic Tiptap React node-view wrapper outline is suppressed for selected image figures so it cannot paint a wider stale rectangle around a narrow image.
- Loaded images do not show the stale rectangular placeholder surface.
- The pristine writing prompt/template suggestion no longer intercepts ordinary editor clicks while its button/menu remain clickable.
- Video support remains removed from current authoring UI.

## Evidence

- `npm run test -- src/app/shell/notebook/canvas/NotebookDirectMediaInteraction.test.ts src/lib/notebook/document/model.test.ts src/lib/notebook/document/tiptap-adapter.test.ts src/lib/notebook/document/pagination.test.ts` — passed, 37 tests.
- `npm run test:ui -- src/app/shell/NotebookPage.ui.test.tsx` — passed, 25 passed / 4 skipped.
- `npx playwright test e2e/notebook-image.spec.ts --project=chromium` — passed, 3 tests.
- `npx vite build` — passed for refreshed Playwright bundle.
- Headless browser diagnostic reproduced the pre-fix split (`figure` 601.734px wide while frame shrank to 48.016px), then confirmed after rebuild that `figure`, shell, frame, viewport, and image all measured 48.016px after the same right-handle shrink. A follow-up source diagnostic found the final visible long line came from `div.react-renderer.node-imageFigure.ProseMirror-selectednode`; the source CSS now suppresses that generic wrapper outline while keeping the measured shell outline.
- Follow-up image geometry ratchet checks that the outer figure has no visible selection outline and that shell, frame, crop viewport, and rendered image dimensions remain aligned after enlargement, downsizing, scale changes, and forced colors.

## Known blockers / exclusions

- `npm run build` / `npx vite build` / source-dev browser verification are blocked by unrelated dirty Calculus/symbolic-engine work: the current app shell fails to load because `/src/lib/symbolic-engine/primitives/symbolic-polynomial/index.ts` does not export `addSymbolicPolynomials` / `multiplySymbolicPolynomials` required by Calculus verification modules.
- `npm run test:file-sizes` is blocked by unrelated dirty symbolic-engine growth: `src/lib/symbolic-engine/integration/dispatch.ts` has 1025 lines, above the 1000-line cap.
- Earlier broad `e2e/notebook-rich-authoring.spec.ts` run still has unrelated/stale failures around MathLive chrome, drawer-width keyboard expectations, and outline collapse selectors; the prompt-overlay click interception failures were fixed and focused checks for prose typing/palette placement passed.
- No commit or push occurred.
