# Verification Summary

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

## NOTEBOOK-LARGE-DOCUMENT-READINESS1

- gate: ui
- status: verified
- model evidence: 2 files and 11 tests pass across 100, 1,000, 5,000, and 50,000-block fixtures; the 5,000-block fixture contains 2,000 inline-math nodes and all fixtures pass strict V6 validation.
- UI evidence: 3 files and 24 tests pass, including the real Tiptap 5,000-block edit contract and viewport-aware MathLive hydration.
- Chromium evidence: 5,000 paragraphs and 2,000 inline-math nodes become ready in 1,211.80 ms; 100 scripted edits measure 77.47 ms P95 and 113.97 ms maximum. Fourteen MathLive fields hydrate near the viewport while 1,986 remain deferred.
- cross-workspace evidence: switching from the large Notebook to Calculate takes 472.22 ms and leaves zero Notebook math views mounted. The same `Calculate` exact solve measures 1,804.21 ms before the Notebook and 1,846.59 ms after it, a 42.38 ms difference inside the relative no-regression bound.
- visual evidence: 2400px, 1440px, and 1100px plus 80%, 130%, high contrast, and forced colors show contained word/save-state status with no page overflow. The inspected large-document view shows the Draft notice, 32,004 words after the edit, readable math, and no clipping.
- static evidence: incremental TypeScript, Notebook-scoped ESLint, file-size validation, memory validation, and diff hygiene pass.
- correction evidence: the first idle-callback app-document sync starved after a large browser edit. It was rejected and replaced with a 350 ms settled-edit sync that resets on each update and flushes on editor destruction; the final Chromium measurements above use the corrected path.
- discarded probe evidence: one strict-locator ambiguity and one absolute Calculate cap below the fresh baseline were harness errors, not product failures. The final probe compares pre-Notebook and post-Notebook latency on the same page.
- resource evidence: no full unit, UI, or canary suite ran; the Vite and Playwright processes used by this gate are stopped after evidence capture.

## NOTEBOOK-PERSISTENCE-FOUNDATION1

- gate: backend
- status: verified
- TypeScript evidence: 4 focused files and 11 tests pass for stored-record validation, in-memory revision ownership, SHA-256 asset deduplication, IndexedDB persistence, and defensive Tauri response validation.
- Rust evidence: 5 focused tests pass for interrupted atomic-write recovery, revision races, content-addressed asset deduplication, unsafe SVG rejection, complete package validation before mutation, current-snapshot portable export, and import-copy identity.
- browser evidence: real Chromium uses the production IndexedDB adapter to save/load/list one record, reject a stale revision, store and reload 41 asset bytes, and deduplicate the repeated asset identity.
- package evidence: `.cwiznb` uses stored ZIP64 entries for the manifest, V6 app document, and declared assets. Traversal, links, encryption, unsupported compression, duplicate/undeclared/incomplete entries, hash mismatch, unsupported media, scriptable SVG, and bounded-size violations fail before library mutation.
- static evidence: incremental TypeScript, Notebook-scoped ESLint, Rust formatting, focused Rust compilation/tests, file-size validation, production build, memory validation, and diff hygiene pass. The production build retains only its existing chunk-size/dynamic-import warnings.
- unavailable optional evidence: `cargo clippy` was attempted but the stable toolchain does not have the Clippy component installed; no lint result is claimed.
- resource evidence: no full unit, UI, or canary suite ran. The Vite/Chromium process used for browser evidence is stopped, `.task_tmp/` remains ignored, and untracked `test-results/` remains excluded.

## NOTEBOOK-DOCUMENT-LIBRARY1

- gate: ui
- status: verified
- model evidence: 6 focused files and 25 tests pass for lightweight tab references, strict history snapshots, bounded retention, IndexedDB and Tauri parity, Trash, warm-record eviction, and recovery when a dirty inactive revision's in-flight save fails.
- UI evidence: 3 focused files and 31 tests pass for 750 ms autosave, Save now, all File backstage routes, already-open focus, failure recovery, existing Notebook authoring behavior, and per-tab selection restoration.
- Rust evidence: all 6 focused Notebook storage tests pass, including 50-snapshot retention and Trash move, restore, and permanent deletion.
- visual evidence: dedicated Chromium evidence passes at 2400px, 1440px, and 1100px, plus 80%, 130%, and forced colors. The Notebook title survives a Calculate tab switch, File remains within the viewport, wide cards use available space, constrained cards reflow to one readable column, and page overflow remains zero.
- static evidence: incremental TypeScript, Notebook-scoped ESLint, Rust formatting, file-size validation, memory validation, and diff hygiene pass.
- correction evidence: the first internal tab-title update incorrectly passed through the manual Rename policy and left the tab labeled `Notebook`; internal Notebook title synchronization is now separate and verified in Chromium. The 130% File card grid was also changed to responsive auto-fit after visual inspection found cramped two-column wrapping.
- resource evidence: no full unit, UI, canary, or redundant production-build gate ran. Gate-owned Vite and Playwright processes were stopped, and untracked `test-results/` remains excluded.

## NOTEBOOK-RIBBON-TABS1

- gate: ui
- status: verified
- UI evidence: 3 focused files and 32 tests pass for Home/Insert grouping, File placement, selection preservation, transient dismissal, evidence/divider insertion with undo/redo, legacy authoring behavior, and per-tab workbench state.
- Chromium evidence: 2 dedicated scenarios pass at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. File, Home, and Insert remain contained; app-level Workspace Tabs do not move; unavailable Image/Video commands are visibly disabled; Layout and contextual tabs remain absent without functional controls.
- visual correction evidence: the first 130% forced-colors inspection found the collapsed Inspector restore rail overlapping a wrapped Document ribbon group. The rail was moved below the ribbon and the final geometry assertion proves no ribbon/rail intersection.
- interaction evidence: switching tabs closes excluded transient menus without losing the Tiptap range; returning to Home applies formatting to that preserved range. File backstage opens and dismisses through the same transient coordinator.
- static evidence: incremental TypeScript, Notebook-scoped ESLint, file-size validation, memory validation, and diff hygiene pass.
- resource evidence: no full unit, UI, canary, or production-build gate ran. Gate-owned Vite and Playwright processes stopped after evidence; untracked `test-results/` remains excluded.

## NOTEBOOK-IMAGE1

- gate: ui
- status: verified
- model evidence: focused document, migration, adapter, semantic, media, and persistence evidence passes 14 files and 58 tests; the final image/storage delta passes 22 of 22 tests.
- Rust evidence: all 8 focused Notebook storage tests pass for V6-to-V7 migration, V7 metadata and crop round trips, content-addressed completeness, safe SVG acceptance, unsafe SVG rejection, and over-100-MP rejection.
- UI evidence: the 25-case Notebook page suite passes its established behavior, the final image delta passes 3 of 3 cases, and the real 5,000-block editor performance regression passes independently.
- Chromium evidence: dedicated scenarios cover 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. Safe SVG insertion, explicit alt warning, Decorative, caption and Figure Outline entry, Picture Format activation/reveal, IndexedDB V7 asset serialization, Escape, GIF rejection, containment, and selected-image visibility all pass.
- correction evidence: Chromium exposed unsupported `createImageBitmap` SVG decoding and a missing selected-node outline. Safe SVG decoding now uses the browser image decoder, with a unit regression, and forced-colors selection uses an explicit system outline.
- static evidence: Notebook-scoped ESLint, file-size validation, exact-patch production build, and diff hygiene pass. The exact staged Notebook patch builds in an isolated clean worktree at `8dd5ca29`; shared-checkout incremental TypeScript/build remains blocked only by concurrent Canonical Result V2 edits outside this gate.
- resource evidence: no full unit, UI, or canary suite ran. Gate-owned Vite and Playwright processes stopped, the temporary clean worktree was removed, and untracked `test-results/` remains excluded.

## NOTEBOOK-PAGE-LAYOUT1

- gate: ui
- status: verified
- model evidence: 22 focused Notebook files and 115 tests pass for strict V8 validation, continuous migration, adapter round trips, all paper/orientation/preset-margin combinations, pagination rules, explicit page breaks, and oversized-object fitting.
- UI evidence: the focused Notebook page suite passes 27 cases for one-editor selection and undo, document-owned settings, page breaks, Print/Draft state, and existing authoring behavior.
- Rust evidence: all 9 focused Notebook storage tests pass for V8 validation, V6/V7 migration defaults, current-version persistence, and top-level-only page breaks.
- Chromium evidence: dedicated page-layout and adjacent ribbon/image scenarios pass at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. V8 IndexedDB state, page geometry, headers/footers/numbering, popover containment, Math Authoring exclusion, and Draft/Print switching are covered.
- correction evidence: the first pagination implementation mutated ProseMirror-owned node DOM and caused node remounts; the final renderer uses a scoped external offset stylesheet. The final Layout visual correction gives controls deliberate spacing and dark high-contrast select values; its dedicated two-case Chromium gate passes and the 1100px dark plus 130% forced-colors screenshots were inspected.
- static evidence: Notebook-scoped ESLint, file-size validation, exact-patch production build, and diff hygiene pass. Shared-checkout incremental TypeScript is blocked only by concurrent Canonical Result V2 files outside this gate; `npm run build` passes from clean `12a91729` with exactly the staged Notebook patch and only the existing chunking warnings.
- resource evidence: no full unit, UI, or canary suite ran. The temporary clean worktree was removed; untracked `test-results/` and unrelated solver/result-contract work remain excluded.

## NOTEBOOK-IMAGE-LAYOUT1

- gate: ui
- status: verified
- model evidence: focused page-layout, pagination, and Tiptap-adapter coverage passes 3 files and 37 tests for page-aware effective placement, oversized media, and unchanged V8 serialization.
- UI evidence: the complete 28-case Notebook page suite passes, including size presets/custom width, alignment, four placement modes, crop/reset, rotation, selection preservation, serialized state, and operation-level undo/redo.
- Chromium evidence: all 3 image scenarios pass at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. Picture popovers remain inside the ribbon, saved V8 state matches the visible image, and no control overlaps Math Authoring.
- correction evidence: the first responsive rule observed only pre-scaled layout width. The final node view measures the live editor content box, keeps the requested Square preference serialized, derives normal-flow fallback below the 240px text-column floor, and makes pagination follow the actual computed float state.
- visual evidence: the 1100px screenshot shows a 50% cropped/rotated image with comfortable side text; the 130% forced-colors screenshot shows the same saved Square Left image in readable normal flow.
- static evidence: incremental TypeScript, Notebook-scoped ESLint, file-size validation, and diff hygiene pass. No production build was required because V8 and package contracts did not change.
- resource evidence: no full unit, UI, or canary suite ran. Gate-owned Vite and Playwright processes stopped; untracked `test-results/` and concurrent solver/result-contract work remain excluded.

## NOTEBOOK-VIDEO1

- gate: ui
- status: verified
- model evidence: 12 focused document, migration, adapter, semantics, media, and persistence files pass 43 tests for strict V9, continuous migration, round trips, MP4/WebM inspection, WebVTT validation, and asset behavior.
- UI evidence: the complete Notebook page suite passes 29 cases, including local video insertion, caption/numbering, poster, WebVTT, sizing/alignment, serialization, selection behavior, and inactive unmount cleanup.
- Rust evidence: 12 focused Notebook storage tests pass for V9 migration/validation, bounded streamed ingestion, deduplication, abort cleanup, opaque server authorization, HEAD, byte ranges, 206, and 416.
- Chromium evidence: the dedicated real WebM scenario passes metadata decode, seek, visible controls, poster, captions, caption-only Outline projection, V9 IndexedDB state, and containment at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors.
- packaged Linux evidence: a debug Tauri application driven through `tauri-driver` and WebKitWebDriver loads the VP9/Opus fixture to ready state 4 with duration 1.008 seconds, native controls, one seekable range, and a successful seek to 0.6 seconds through the Rust HTTP range server.
- correction evidence: packaged WebKitGTK rejected the first custom URI source with `MEDIA_ERR_SRC_NOT_SUPPORTED`. The final Rust-owned `127.0.0.1` server uses an ephemeral port, random capability token, asset hash, bounded headers, streaming reads, and no local paths; packaged metadata and seek evidence then passed.
- visual evidence: the inspected 130% forced-colors screenshot shows readable Video Format controls, title/description, poster/native player, caption, Outline entry, and no page overflow.
- static evidence: production build, incremental TypeScript, Notebook-scoped ESLint, file-size validation, and diff hygiene pass. The final extraction reduces `NotebookRichCanvas.tsx` from 1,120 to 800 lines; its affected TypeScript, lint, 29-case UI, and Chromium evidence were rerun.
- resource evidence: no broad unit/UI/canary suite ran. Gate-owned Tauri, WebKitWebDriver, Vite, and Playwright processes stopped; ignored `.task_tmp/`, untracked `test-results/`, and concurrent Canonical Result/OOE work remain excluded.

## NOTEBOOK-EXPORT-PROJECTION1

- gate: backend
- status: verified
- model evidence: 8 focused tests pass for immutable projection snapshots, target-specific asset resolution, static video reporting, document-order Section scope, exact PDF page-range geometry, invalid-scope rejection, frozen revisions, low-priority scheduling, cancellation, missing assets, and source non-mutation.
- contract evidence: the projection contains only app-owned block subtrees, source identity/revision, V8 page setup/running matter/derived fragments, resolved immutable target assets, typed request scope, and compatibility evidence. Tiptap JSON, editor DOM, calculator output, and History mutation are absent.
- compatibility evidence: report summaries always expose video substitution, equation fallback, font substitution, and layout-approximation counts. PDF static-video assets exclude the original video; Web retains video/WebVTT; DOCX/Web report reflow and reject physical page ranges.
- static evidence: incremental TypeScript, Notebook-publication ESLint, file-size validation, memory validation, and diff hygiene pass. Production source remains between 3 and 271 lines.
- resource evidence: no UI, Playwright, Rust, production-build, broad unit, or canary gate ran because this is a backend-only contract milestone. Concurrent Canonical Result/OOE work and untracked `test-results/` remain excluded.
