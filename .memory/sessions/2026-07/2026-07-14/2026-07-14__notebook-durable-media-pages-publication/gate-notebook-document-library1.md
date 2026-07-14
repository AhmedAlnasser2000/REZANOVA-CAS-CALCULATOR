# NOTEBOOK-DOCUMENT-LIBRARY1 Gate

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

## Gate

- kind: ui
- status: verified
- approval: standing user approval recorded on 2026-07-14

## Implemented

- The active editor now uses a durable `NotebookStoredRecordV1`; the workspace surface retains only library identity, revision, title, and Notebook view state.
- New and template actions create a local library document immediately. Settled editing autosaves after 750 ms and `Ctrl/Cmd+S` saves immediately.
- Visible save state is `Saving…`, `Saved locally`, `Unsaved changes`, or `Save failed`.
- File backstage provides New, templates, Recent, All Notebooks, `.cwiznb` import/export, version history, and Trash.
- Opening an already-open library identity focuses its existing Workspace Tab; closing a tab does not delete the library record.
- Version history retains at most 50 snapshots from 30 days, spaces periodic snapshots by at least five minutes, and records explicit pre-restore and pre-Trash snapshots.
- A failed save leaves the current document resident with Retry, recovery export, and Close without saving actions.
- At most one asset-free record below 16 MiB may remain warm. Media-bearing and oversized documents are evicted when inactive.
- Rust, IndexedDB, in-memory, and Tauri library adapters expose matching version-history and Trash operations.

## Evidence

- model and persistence: 6 focused files and 25 tests pass for lightweight surface references, strict snapshots, 50-entry retention, IndexedDB history/Trash, Tauri routing, inactive-record eviction, and unsaved warm-revision recovery after an in-flight save failure.
- UI: 3 focused files and 31 tests pass, including 750 ms autosave, Save now, File backstage, history/Trash, already-open focus, save failure recovery, editor regressions, and tab selection restoration.
- Rust: 6 focused Notebook storage tests pass, including bounded history and Trash restore/permanent deletion.
- Chromium: one dedicated scenario passes at 2400, 1440, and 1100 pixels, 80% and 130% scale, forced colors, and a Notebook-to-Calculate-to-Notebook switch. File backstage remains contained, responsive, readable, and free of page overflow.
- static: incremental TypeScript, Notebook-scoped ESLint, file-size validation, memory validation, Rust formatting, and diff hygiene pass.
- resource: no full unit, UI, canary, or production-build gate ran. Gate-owned Vite and Playwright processes were stopped; untracked `test-results/` remains excluded.

## Boundary

- No document-contract version change, media node, page layout, publication export, cloud sync, app-state schema, solver, OOE, Surface Protocol, `AppMain`, or `ActiveSurfaceHost` ownership change.
- Next gate: `NOTEBOOK-RIBBON-TABS1`.
