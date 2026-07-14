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
- `NOTEBOOK-IMAGE1` is committed as `b61dd6dc`.
- `NOTEBOOK-PAGE-LAYOUT1` is verified under the standing commit approval. Strict V8 adds point-based page setup, simple headers and footers, page numbering, and explicit page breaks while keeping all physical pages derived over one Tiptap editor.
- Print Layout is the per-tab default, Draft remains the continuous performance view, and the Layout ribbon now exposes functional page controls with readable, deliberately spaced responsive affordances.
- `NOTEBOOK-PAGE-LAYOUT1` is committed as `f3a9a95d`.
- `NOTEBOOK-IMAGE-LAYOUT1` is verified under the standing commit approval. Picture Format now exposes bounded size, alignment, page-aware wrapping, non-destructive crop, and 90-degree rotation while preserving one editor selection and undo history.
- Square wrapping retains its serialized preference and falls back to normal flow when canonical page geometry or live rendered width cannot keep body text readable.
- `NOTEBOOK-IMAGE-LAYOUT1` is committed as `3356786e`.
- `NOTEBOOK-VIDEO1` is verified under the standing commit approval. Strict V9 adds local MP4/WebM figures with title/description/caption numbering, poster, WebVTT, width/alignment, loop state, Outline projection, and inactive playback cleanup.
- Desktop videos stream into content-addressed storage and play through an opaque randomized loopback capability URL with GET/HEAD and byte ranges. Packaged WebKitGTK metadata and seeking pass after the unsupported custom URI approach was removed.
- `NOTEBOOK-VIDEO1` is committed as `8b00acef`.
- `NOTEBOOK-EXPORT-PROJECTION1` is verified under the standing commit approval. The immutable version-1 projection freezes source identity/revision, app blocks, page geometry, target-required assets, scope, and compatibility evidence before format adapters run.
- Whole-document, exact PDF page-range, and document-ordered top-level Section scopes are live at the contract layer. DOCX/Web reflow is explicit, and low-priority cancellable jobs remain independent from mounted Notebook tabs without mutating documents or History.
- `NOTEBOOK-EXPORT-PROJECTION1` is committed as `e4710c76`.
- `NOTEBOOK-EXPORT-PDF1` is verified under the standing commit approval. File backstage now prepares a compatibility report and dedicated typed physical-page preview from the frozen current revision, then invokes the system Print/Save as PDF dialog.
- Whole document, exact physical page range, and selected top-level Sections are supported. Static math, selectable text, safe SVG/image formatting, captions, structured colors, headers/footers, numbering, explicit breaks, and static video descriptions are included without a second PDF engine or direct PDF byte generation.
- `NOTEBOOK-EXPORT-PDF1` is committed as `4d977b2a`.
- `NOTEBOOK-EXPORT-DOCX1` is committed as `ecdef08f`. File backstage creates whole-document or selected-Section `.docx` publications from the frozen projection, with editable OOXML structures, bounded OMML conversion, SVG/PNG alternate equation content, image fallbacks, and static video substitutions.
- `NOTEBOOK-EXPORT-WEB1` is verified under the standing commit approval. File backstage creates self-contained offline ZIP publications for whole documents or selected top-level Sections, with escaped semantic HTML, scoped responsive/print CSS, safe static MathML, and content-hashed local media/WebVTT.
- Interactive MP4/WebM remains playable with controls and captions. CSP and generated-path rules exclude executable author content, remote resources, editor runtime, solver authority, service workers, and original local paths.
- The final model, UI, Chromium download, artifact rendering, TypeScript, focused lint, production build, file-size, memory, and diff gates pass. All twelve program gates are complete; the manual verification checklist is recorded beside this report.
- Microsoft 365 Word smoke remains unavailable, so DOCX compatibility is provisional rather than overstated. No push is authorized.
