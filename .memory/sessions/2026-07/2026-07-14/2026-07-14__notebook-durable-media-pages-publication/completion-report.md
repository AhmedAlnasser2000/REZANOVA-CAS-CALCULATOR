# Notebook Durable Media, Pages, And Publication Program

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

## Program State

- `NOTEBOOK-LARGE-DOCUMENT-READINESS1` is committed as `4e275f06`.
- Notebook block count remains diagnostic rather than a product limit. The author-facing status now shows word count and the honest pre-persistence `Session only` state.
- The committed readiness floor is normal live authoring at 5,000 text-heavy blocks including 2,000 inline-math nodes. Fifty thousand blocks is a validation/import safety fixture, not a promise of equivalent live-editing latency.
- Large documents use the continuous Draft view, settled app-document synchronization, off-path metrics and validation, and viewport-aware MathLive hydration without changing the single-editor selection or undo model.
- `NOTEBOOK-PERSISTENCE-FOUNDATION1` is verified under the standing commit approval. It separates the V6 app document from a versioned library record, adds atomic Rust storage and recovery, content-addressed assets, validated ZIP64 `.cwiznb` packages, Tauri ports, and browser IndexedDB parity.
- Package import validates every declared entry before mutation and creates a fresh library identity; portable export uses the passed current revision without changing the saved record.
- `NOTEBOOK-PERSISTENCE-FOUNDATION1` is committed as `a1c2b708`.
- `NOTEBOOK-DOCUMENT-LIBRARY1` is verified under the standing commit approval. Notebook documents are created locally immediately, autosave after 750 ms, save immediately on `Ctrl/Cmd+S`, and expose truthful saved/unsaved/failure status.
- File backstage now owns New, templates, Recent, All Notebooks, `.cwiznb` import/export, bounded version history, and Trash. Workspace Tabs retain only library identity, revision, title, and view state; an already-open document is focused instead of duplicated.
- `NOTEBOOK-DOCUMENT-LIBRARY1` is committed as `98530d12`.
- `NOTEBOOK-RIBBON-TABS1` is verified under the standing commit approval. File backstage now sits beside Home and Insert, Home owns Font/Paragraph/Styles/Edit, and Insert owns Structure/Math/Media/Document without altering app-level Workspace Tabs.
- Evidence and Divider are live undoable insertions. `NOTEBOOK-RIBBON-TABS1` is committed as `64f3b955`.
- `NOTEBOOK-IMAGE1` is verified under the standing commit approval. Strict V7 adds durable block image figures backed by content-addressed assets, with PNG, JPEG, static WebP, and safe static SVG ingestion through picker, paste, or drop.
- Unsafe, animated, unsupported, over-dimension, and over-complexity content is rejected before document mutation. Accessibility details, optional caption numbering, Outline projection, and contextual Picture Format behavior are live; page-aware image layout remains sequenced after V8.
- The next gate is `NOTEBOOK-PAGE-LAYOUT1`; video and publication remain sequenced after pages and image layout.
