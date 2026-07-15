# `NOTEBOOK-FLOATING-OBJECT-MODEL1` — Backend / Schema 13

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

## Gate State

- status: verified
- document contract: Schema 13
- gate kind: backend/schema

## Implemented Contract

- Schema 13 adds one optional `objectPlacement` union to images, videos, display equations, evidence, dividers, academic containers, and complete Section subtrees.
- Flow is the default and historical state. Floating placement stores a paragraph or physical-page anchor, page/margin references, canonical-point X/Y/width, Square/Top-and-Bottom/In-Front/Behind wrapping, four text distances, and explicit layer order.
- Paragraph anchors must resolve to a durable paragraph outside the floating structured object's own subtree. Page anchors are bounded positive page numbers.
- Floating widths have a 36-point minimum; coordinates are finite; text distances are finite and nonnegative; layer indices are globally contiguous from zero.
- Images and videos retain their existing flow placement fields independently from the new floating contract.
- V12 validates strictly without placement fields and migrates to V13 by changing only the version. Durable V6 through V12 inputs continue migrating in memory without synthesized placement.
- Tiptap attributes are app-owned and non-rendered in this gate. Pagination and direct manipulation intentionally remain for the next gates.

## Durable Round Trips

- Browser IndexedDB records, version snapshots, and Trash preserve floating placement.
- Rust active records, versions, Trash/restore, recovery, and ZIP64 `.cwiznb` packages validate and preserve Schema 13 placement.
- New writes remain strict current-schema writes; unsupported future schemas remain Schema 14 and above.

## Focused Verification

- 48 focused TypeScript model, adapter, surface-state, persistence, and Tauri-ingress tests passed.
- 17 continuous historical migration tests passed.
- 19 focused Rust Notebook storage/package tests passed.
- The post-extraction model/adapter/floating-contract delta passed 19 focused tests.
- Incremental TypeScript, Notebook-scoped ESLint, Rust formatting, file-size validation, diff hygiene, and the Schema 13 production build passed.
- The file-size ratchet rejected the initial 1,076-line `model.ts`; placement validation was extracted into one focused module and the cap was not raised.

## Process Hygiene

- This backend-only gate launched no browser, Tauri window, preview, or media process.
- The pre-existing Playwright service was not touched.
- Concurrent non-Notebook memory changes and untracked `test-results/` remain excluded from the selective commit.

## Gate Conclusion

- The Schema 13 durable object model is verified and ready for the approved selective commit.
- `NOTEBOOK-FLOATING-PAGINATION1` is next.
