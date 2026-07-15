# NOTEBOOK-DURABLE-SCHEMA-REPAIR1 Verification Summary

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

- kind: backend/ui
- status: verified; selective commit authorized
- current_schema: 11
- minimum_durable_schema: 6

## Behavior Evidence

- Durable Schemas 6-10 migrate in memory to Schema 11 across browser, Tauri, active records, versions, Trash/Restore, recovery, and `.cwiznb` import.
- New writes remain strict Schema 11. Opening a legacy record does not rewrite it; first Save preserves one deduplicated raw `before-schema-upgrade` snapshot before atomic replacement.
- Failure UI distinguishes newer schema, unsupported pre-Schema-6 input, damaged/incomplete records, and unavailable storage, with Retry, library return, and diagnostic raw recovery when readable.
- Future and pre-Schema-6 records are never silently replaced by an older recovery copy.

## Automated Evidence

- Rust Notebook storage/package: 19 passed.
- TypeScript persistence: 23 passed.
- Notebook page, recovery, and session UI: 35 passed.
- Incremental TypeScript, Notebook-scoped ESLint, Rust check/format, file-size ratchet, memory protocol, and diff hygiene: passed.
- Production Tauri build and AppImage/deb/rpm packaging: passed before bounded review corrections; targeted delta checks passed afterward.

## Packaged Linux Evidence

- Isolated AppImage profile opened a real Schema 10 revision 2 record with title, text, referenced image, Letter/landscape page setup, legacy header/footer, and page numbering intact.
- Before Save, the active file remained byte-identical to the seeded V10 baseline: `bc10740ec523b8a0efa5dd9fc885d811f9f02f0b68ea04dd842fe2b9d30db4a3`.
- Explicit Save produced Schema 11 revision 3 and one raw Schema 10 revision 2 `before-schema-upgrade` snapshot.
- After a complete packaged-app restart, the library showed revision 3 with one asset and visibly reopened the same authored content and layout.
- All packaged verification processes were stopped.

## Commit Boundary

- Stage only Notebook Rust storage, Notebook persistence/UI/tests/styles, this program dossier, current-state, decisions, and journal hunks.
- Exclude concurrent Linear Algebra work and `test-results/`.
- Do not push.
