# `NOTEBOOK-LIBRARY-FILE-OPERATIONS1` — UI/Backend Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors: gate3_review; native_save_review; library_ui_review
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Delivered

- Added single, toggle, and range Notebook selection; double-click open; viewport-safe context actions; and bounded multi-record Trash, Restore, and confirmed Delete Forever flows.
- Added guarded single-record Rename, Duplicate, and portable-copy actions. Duplicate receives fresh document/library identity and revision 1 while immutable content-addressed assets are reused.
- Removed the global current-record Trash action. An active record may move to Trash only after save/snapshot and receives a new blank Notebook tab; records open elsewhere are protected through the existing workspace-event seam.
- Added a small `NotebookExportSavePort`. Desktop saves through an opaque ID, appends at most 1 MiB chunks to a sibling temporary file, then atomically replaces the chosen destination. The renderer never receives a native path.
- Desktop save choices normalize the selected output extension. Browser DOCX/Web uses File System Access when available and a clearly labeled download fallback otherwise; cancellation writes nothing. `.cwiznb` package/recovery flows remain desktop-only because package construction and full validation are Rust-owned.
- Fixed the File backstage scale-width calculation so its close affordance and portaled menus remain inside the viewport at scaled widths.
- Replaced the deprecated React type-only `FormEvent` alias with the specific current `SubmitEvent` type. No deprecated runtime package is involved.

## Evidence

- `npx vitest run --config vitest.ui.config.ts src/app/shell/notebook/library/NotebookLibrary.ui.test.tsx src/app/shell/notebook/library/useNotebookLibrarySession.ui.test.tsx src/app/runtime/useWorkspaceTabsShellRuntime.ui.test.tsx src/app/shell/notebook/publication/NotebookDocxExportDialog.ui.test.tsx src/app/shell/notebook/publication/NotebookWebExportDialog.ui.test.tsx --maxWorkers=4` — 25 passed.
- `npx vitest run src/lib/notebook/persistence/export-save.test.ts --maxWorkers=4` — 7 passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check && cargo test --manifest-path src-tauri/Cargo.toml notebook_storage --lib` — 15 passed.
- `npx playwright test e2e/notebook-document-library.spec.ts e2e/notebook-docx-publication.spec.ts e2e/notebook-web-publication.spec.ts --project=chromium --workers=1 --reporter=list` — 3 passed. Chromium screenshots were inspected at 2400px, 1440px, 1100px, 80% scale, and 130% forced colors.
- `npx tsc -b --pretty false`, scoped Notebook ESLint, `npx vite build`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check` — passed.
- Preview and Playwright processes were stopped after capture. Concurrent Linear Algebra work and untracked `test-results/` remain excluded.

## Commit

- Standing user approval for this named gate was recorded on 2026-07-14.
- Candidate scope contains only Notebook library/save source, focused tests, required Tauri storage code, styles, and the durable-memory updates above.
