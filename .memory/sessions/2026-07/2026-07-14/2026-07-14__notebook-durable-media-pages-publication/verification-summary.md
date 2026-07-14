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
