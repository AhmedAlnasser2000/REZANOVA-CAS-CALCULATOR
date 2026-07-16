# 2026-07-16 — NOTEBOOK-VIDEO-REMOVAL1

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
- gate_label: backend
- commit: not committed
- push: not pushed

## Scope

- Removed Notebook video support from the current Schema 14 authoring, storage, ribbon, NodeView, media helper, publication, and CSS surfaces.
- Current documents reject `videoFigure` blocks, `video/mp4`, `video/webm`, and streamed-video uploads.
- Legacy Schema 9 through 13 video figures migrate to plain paragraphs with `Video removed: ...` text so old records remain openable without keeping live playback support.
- Historical memory entries for earlier video milestones were preserved; `.memory/current-state.md` records only the current superseding posture.

## Evidence

- `npx tsc -b --pretty false` — pass.
- `npm run test:ui -- src/app/shell/NotebookPage.ui.test.tsx src/app/shell/notebook/publication/NotebookPdfExportDialog.ui.test.tsx src/app/shell/notebook/publication/NotebookDocxExportDialog.ui.test.tsx` — pass, 30 passed and 4 skipped.
- `npm run test -- src/app/shell/notebook/canvas/NotebookDirectMediaInteraction.test.ts src/lib/notebook/document/model.test.ts src/lib/notebook/document/migrate-v8.test.ts src/lib/notebook/document/migrate-v9.test.ts src/lib/notebook/document/migrate-v12.test.ts src/lib/notebook/document/floating-placement.test.ts src/lib/notebook/document/semantics.test.ts src/lib/notebook/document/tiptap-adapter.test.ts src/lib/notebook/persistence/contracts.test.ts src/lib/notebook/persistence/indexed-db.test.ts src/lib/notebook/publication/projection.test.ts src/lib/notebook/publication/web.test.ts src/lib/notebook/publication/docx.test.ts` — pass, 63 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml notebook_storage` — pass with escalation for loopback media-server binding, 20 Rust tests passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` — pass.
- `git diff --check` — pass before final memory/file-size gates.

## Stopped Plan Recut

- The video presentation-host and video asset-metadata gates are superseded by removal.
- Image direct manipulation remains the active media lane.
- Floating layout, Notebook settings, accessibility/publication parity, ratchet coverage, and TypeScript/Rust schema-boundary consolidation remain valid, but must be recut around images and structured objects only.
