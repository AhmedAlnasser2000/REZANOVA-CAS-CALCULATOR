# `NOTEBOOK-HEADER-FOOTER-DIRECT-AUTHORING1` — UI/Document Gate

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

- Advanced the app-owned Notebook document from V10 to V11 with strict legacy V10 validation and continuous V1-V11 migration. Legacy header/footer text and numbering migrate into formatted default/first-page left, center, and right running-matter regions without losing the former blank-first-page behavior.
- Added paragraph-only running matter with bounded multiline text, existing prose marks, and live page-number fields. Headings, lists, math, tables, and media are rejected by V11 validation.
- Added direct Print Layout header/footer authoring through one temporary Tiptap editor. All physical pages mirror the active region; the body is dimmed and suspended; closing commits the full session as one document transaction so body undo/redo treats it as one authoring action.
- Added a functional Header & Footer contextual ribbon for header/footer and region navigation, Different First Page, page-number insertion, starting number, and close. Home font controls target the temporary editor while it is active.
- Updated Print/PDF, DOCX, Web, `.cwiznb`, autosave, version-history, adapter, and migration paths for lossless V11 content. DOCX emits editable PAGE fields, while responsive Web omits meaningless screen page numbers and reports its print-counter limitation.

## Evidence

- Focused migration/model/persistence/publication tests pass: 29 model/persistence/publication tests and 8 DOCX/Web/conversion tests.
- Focused UI evidence passes collectively: 32 affected Notebook page/PDF tests, including formatted regions, first-page content, live fields, editing lifecycle, save, and one-step body undo/redo.
- `npx playwright test e2e/notebook-page-layout.spec.ts --project=chromium` — 2 passed across direct editing and layout evidence; the active editor was visually inspected after the final toolbar spacing correction.
- `npx playwright test e2e/notebook-pdf-publication.spec.ts --project=chromium` — 1 passed; the 1440-pixel PDF projection was visually inspected for readable running matter, body content, and scope controls.
- Notebook-scoped ESLint, incremental TypeScript, production build, and `git diff --check` pass. `NotebookRichCanvas.tsx` is exactly 1,000 lines and `NotebookPage.ui.test.tsx` is exactly 1,500 lines, within their applicable caps.

## Shared-Tree Blocker

- `npm run test:file-sizes` passes 9 of 10 validator tests but its repository-state subtest stops only on concurrent foreign `src/AppMain.tsx` at 3,308 lines against its existing 3,306-line cap. No Notebook file exceeds its cap, and the foreign file remains untouched and excluded.
- No Rust code changed in this gate, so a Rust test rerun was not applicable.

## Commit

- Candidate scope is limited to Notebook V11 source, focused Notebook tests/evidence specifications, Notebook styles, and these required durable-memory updates.
- The user approved this milestone commit in advance. No push is authorized.
