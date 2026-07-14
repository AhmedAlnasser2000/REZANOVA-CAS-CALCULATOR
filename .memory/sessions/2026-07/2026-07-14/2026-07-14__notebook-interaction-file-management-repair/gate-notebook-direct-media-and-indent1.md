# `NOTEBOOK-DIRECT-MEDIA-AND-INDENT1` — UI/Document Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: v10_contract_audit; crop_persistence_fix; v10_media_ui_audit; v10_scope_review; v10_playwright_update
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Delivered

- Advanced Notebook rich documents from V9 to V10 with lossless V9 migration, strict V10 validation, paragraph left indentation, image/video display aspect ratios, whole-degree image rotation, and video snap-and-wrap placement.
- Added app-document, Tiptap, persistence-package, pagination, print, DOCX, and Web round trips for the V10 fields.
- Added visible Home → Paragraph Increase/Decrease Indent controls. Prose/headings move in 36-point steps; list selections use existing sink/lift behavior; mixed prose/list selections remain disabled.
- Added eight direct resize handles for images and video, image-only whole-degree rotation and crop mode, Escape cancellation, one transaction per committed gesture, and physical-page-size fitting.
- Moved direct controls onto the actual media shell, so captions and video headings do not distort the control box and image controls rotate with the image.
- Added a transient, pointer-events-none drag ghost, before/after insertion guide, snap-and-wrap drop outcomes, and lower-left derived `Page N · X … pt · Y … pt`/Draft coordinates. No arbitrary X/Y is persisted.
- Preserved V9 crop values losslessly. The 10% visible-area floor applies to direct V10 crop gestures rather than retroactively rejecting otherwise valid older documents.

## Coordination

- `v10_contract_audit` implemented/reviewed V10 contract, migration, storage, and publication coverage.
- `crop_persistence_fix` isolated the image crop partial-attribute persistence defect and supplied its targeted repair.
- `v10_media_ui_audit` provided the direct-media node-view/interaction slice.
- `v10_scope_review` identified shell/rotation/drag-preview/pagination correctness gaps before final verification.
- `v10_playwright_update` updated and executed focused Chromium evidence.

## Evidence

- `npx vitest run src/lib/notebook/document/migrate-v9.test.ts src/lib/notebook/document/model.test.ts src/lib/notebook/document/tiptap-adapter.test.ts src/lib/notebook/persistence/contracts.test.ts src/lib/notebook/persistence/indexed-db.test.ts src/lib/notebook/publication/projection.test.ts src/lib/notebook/publication/docx.test.ts src/lib/notebook/publication/web.test.ts --maxWorkers=4` — 43 passed.
- `npx vitest run --config vitest.ui.config.ts src/app/shell/NotebookPage.ui.test.tsx src/app/shell/notebook/canvas/NotebookParagraphControls.ui.test.tsx --maxWorkers=4` — 39 passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check && cargo test --manifest-path src-tauri/Cargo.toml notebook_storage --lib` — 13 passed.
- `npx playwright test e2e/notebook-image.spec.ts e2e/notebook-video.spec.ts e2e/notebook-page-layout.spec.ts --project=chromium --workers=1` — 6 passed; direct controls were visually inspected at 2400px, 1440px, 1100px, 80% scale, and 130% forced colors.
- `npx tsc -b --pretty false`, scoped Notebook ESLint, `npm run build`, `npm run test:file-sizes`, and `git diff --check` — passed.
- Browser preview and temporary Playwright workers were stopped after capture. `test-results/` remains untracked and excluded.

## Commit

- Standing user approval for this gate was recorded on 2026-07-14.
- Candidate scope excludes concurrent Library-file-operation and Linear Algebra work.
