# NOTEBOOK-IMAGE1

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

- milestone: `NOTEBOOK-IMAGE1`
- kind: ui
- status: verified
- approval: standing user approval recorded on 2026-07-14
- push_authorization: none

## Implemented Contract

- Notebook rich documents advance from V6 to strict V7 with continuous V1-V7 migration and complete Tiptap adapter round trips.
- A block image figure owns its content-addressed asset ID, alt/decorative state, optional caption and automatic Figure numbering, width, alignment, placement, rotation, and non-destructive crop metadata.
- Accepted formats are PNG, JPEG, static WebP, and safe static SVG. GIF, APNG, animated WebP, AVIF, executable or externally referencing SVG, unsupported decodes, excessive dimensions, excessive SVG size or complexity, storage failures, and quota failures are rejected.
- Picker, clipboard, and drag/drop insertion store the asset before one undoable document transaction. A failed new ingestion removes its asset and never leaves an orphan document node; a deduplicated shared asset is retained.
- Insert activates Picture Format once. Later picture selection reveals the contextual tab without stealing the current authoring tab. Picture details own accessibility and caption editing; only captioned figures appear in Outline.

## Verification Evidence

- Focused document, media, persistence, and migration evidence passes 14 files and 58 tests; the final storage/media delta passes 22 of 22 tests.
- Focused Notebook UI passes 25 existing cases, then 3 of 3 image cases after the bounded image corrections; the 5,000-block performance regression passes independently.
- Rust Notebook storage passes 8 of 8 tests for V6 migration, V7 round trips, image metadata, SVG safety, 100 MP rejection, and package completeness.
- Notebook-scoped ESLint and file-size validation pass.
- Chromium evidence covers 2400px, 1440px, and 1100px plus 80%, 130%, and forced colors. It verifies safe SVG insertion, the alt warning and Decorative alternative, captions and Outline projection, Picture Format behavior, IndexedDB V7 serialization, Escape dismissal, GIF rejection, containment, and selected-picture visibility.
- The exact staged Notebook patch passes `npm run build` in an isolated clean worktree at `8dd5ca29`. The shared checkout TypeScript/build was blocked only by concurrent Canonical Result V2 edits outside Notebook ownership.
- Gate-owned Vite and Playwright processes were stopped after evidence. Untracked `test-results/` and concurrent Canonical Result V2 files remain excluded.

## Handoff

- `NOTEBOOK-PAGE-LAYOUT1` is the next gate.
- V7 image metadata deliberately precedes page-aware wrapping and crop/rotation controls; those controls remain assigned to `NOTEBOOK-IMAGE-LAYOUT1` after V8 page geometry exists.
