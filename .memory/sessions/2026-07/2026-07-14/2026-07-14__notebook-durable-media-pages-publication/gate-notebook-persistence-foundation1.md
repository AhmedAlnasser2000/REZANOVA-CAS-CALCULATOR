# NOTEBOOK-PERSISTENCE-FOUNDATION1 Gate

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
- committed_by_agent: codex
- committed_by_agent_model: gpt-5.5
- committed_by_agent_family: sol
- attribution_basis: live

## Gate

- kind: backend
- status: verified
- commit approval: standing approval for all twelve named program gates
- push: not authorized

## Outcome

- `NotebookStoredRecordV1` is separate from `NotebookRichDocumentV6` and owns library identity, monotonic revision, save timestamp, the validated app document, and content-addressed asset references.
- `NotebookLibraryPort`, `NotebookAssetPort`, and `NotebookPackagePort` now have in-memory contract adapters, defensive Tauri adapters, and browser IndexedDB library/asset adapters.
- Desktop Rust owns synchronized atomic replacement, previous/next recovery copies and metadata, SHA-256 asset storage, and `.cwiznb` ZIP64 package construction and validation.
- Portable export serializes the passed current in-memory record without writing it to the library. Import fully validates the package, deduplicates its assets, creates a fresh library identity, and writes the record last.

## Evidence

- Focused TypeScript: 4 files, 11 tests passed.
- Focused Rust: 5 tests passed.
- Real Chromium IndexedDB: one record round-tripped and listed, stale-revision ownership failed closed, 41 asset bytes round-tripped, and duplicate bytes reused one SHA-256 identity.
- Incremental TypeScript and Notebook-scoped ESLint pass.
- The package-closeout production build passes with only the existing chunk warnings.
- File-size, memory-protocol, and diff-hygiene gates pass.
- `cargo clippy` is unavailable because the component is not installed; focused Rust compilation/tests and formatting pass.

## Boundaries

- This gate does not connect the active Notebook editor to autosave, save status, library navigation, File backstage, or version history; visible status remains `Session only` until Gate 3.
- No document-version change, media node, page layout, publication adapter, app-state schema, History, Display, solver, Order of Execution, Surface Protocol, `AppMain`, or `ActiveSurfaceHost` ownership changed.
- Untracked `test-results/` and ignored `.task_tmp/` evidence remain outside the commit.
- Next gate: `NOTEBOOK-DOCUMENT-LIBRARY1`.
