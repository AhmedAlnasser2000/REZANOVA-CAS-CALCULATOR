# NOTEBOOK-VIDEO1

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

- milestone: `NOTEBOOK-VIDEO1`
- kind: ui
- status: verified; committed by the checkpoint containing this entry
- approval: standing user approval recorded on 2026-07-14
- push_authorization: none

## Implemented Contract

- Notebook rich documents advance from V8 to strict V9 with continuous V1-V9 migration and complete app-document/Tiptap/native-storage round trips.
- Local block videos support MP4 and WebM only after declared-type, header, runtime codec, and metadata decode checks. Video figures persist title, description, optional caption and automatic Video numbering, optional poster and WebVTT assets, bounded width/alignment, and loop state.
- Playback controls are always visible; autoplay, remote URLs, GIFs, trim, crop, rotation, and wrapping are absent. Only captioned videos appear in Outline, and inactive unmount pauses playback, removes the source, and revokes browser object URLs.
- Browser assets retain IndexedDB behavior. Desktop ingestion streams bounded chunks into SHA-256 content-addressed storage without loading the complete video in Rust memory.
- Native playback uses a Rust-owned `127.0.0.1` server with an ephemeral port and randomized per-library capability token. URLs expose only the token and asset hash; GET/HEAD, one byte range, 206/416, bounded request headers, MIME, `nosniff`, and private immutable caching are supported.

## Verification Evidence

- Model/media/persistence evidence passes 12 focused files and 43 tests; the complete Notebook page UI passes 29 cases including insertion, poster, WebVTT, formatting, serialization, and unmount cleanup.
- Rust Notebook storage passes 12 focused tests for V9 validation/migration, streamed chunk ingestion, deduplication, abort cleanup, opaque HTTP authorization, HEAD, suffix and explicit ranges, 206, and 416.
- Chromium evidence passes the dedicated real WebM scenario at 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. Metadata decode, seeking, controls, poster, captions, Outline projection, V9 IndexedDB state, and containment pass.
- The inspected 130% forced-colors screenshot keeps the video, poster, native controls, caption, Outline entry, and Video Format controls readable and contained.
- Packaged Linux evidence uses the debug Tauri binary through `tauri-driver` and WebKitWebDriver 2.52.3. A real VP9/Opus WebM reports ready state 4, duration 1.008 seconds, one seekable range, and successful seek to 0.6 seconds through the Rust byte-range server; the library record contains its asset.
- The initial custom URI protocol was rejected after packaged WebKitGTK returned `MEDIA_ERR_SRC_NOT_SUPPORTED`. The capability-scoped loopback HTTP design replaced it and passed the packaged playback/seek proof.
- Incremental TypeScript, Notebook-scoped lint, production build, file-size validation, and diff hygiene pass. A final authoring-hook extraction reduced `NotebookRichCanvas.tsx` from 1,120 to 800 lines; targeted TypeScript, lint, UI, and Chromium deltas pass without repeating broad suites.
- Gate-owned Tauri, WebKitWebDriver, preview, and Playwright processes are stopped. Ignored `.task_tmp/` evidence, untracked `test-results/`, and concurrent Canonical Result/OOE work remain excluded.
- Cross-lane note: while this selective checkpoint was being prepared, the concurrent Canonical Result Linear Algebra commit `ee74ee71` included the already-refreshed `.memory/current-state.md`. The Notebook commit therefore stages the remaining required dossier, decision, and journal memory without duplicating that snapshot change.

## Handoff

- `NOTEBOOK-EXPORT-PROJECTION1` is next.
- Publication adapters must consume a frozen typed projection, never Tiptap JSON, editor DOM, or live playback state.
