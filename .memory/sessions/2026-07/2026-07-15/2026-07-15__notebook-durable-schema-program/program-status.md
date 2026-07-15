# Notebook Durable Schema Repair And Consolidation Program

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

## Boundary

- Complete `NOTEBOOK-DURABLE-SCHEMA-REPAIR1` before `NOTEBOOK-SCHEMA-BOUNDARY-CONSOLIDATION1`.
- Schema 11 remains current. Durable desktop and `.cwiznb` compatibility begins at Schema 6; Schemas 1-5 remain TypeScript-only internal recovery inputs.
- Legacy records migrate in memory on open and remain unchanged on disk until the next save. The first upgrade save preserves one raw pre-upgrade snapshot.
- Preserve concurrent Linear Algebra work, shared memory hunks, and `test-results/`. Do not push.

## Status

| Gate | Kind | Status |
| --- | --- | --- |
| `NOTEBOOK-DURABLE-SCHEMA-REPAIR1` | backend/ui | verified; selective commit authorized |
| `NOTEBOOK-SCHEMA-BOUNDARY-CONSOLIDATION1` | backend | pending |

## Current Handoff

- Gate 1 implementation is complete in the working tree. Rust and TypeScript accept durable Schemas 6-11 at ingress, migrate legacy records in memory, keep writes strict at Schema 11, preserve one raw upgrade snapshot on first save, retain raw records through Trash/Restore, and migrate valid legacy `.cwiznb` packages into new current-schema identities.
- The renderer now classifies newer-schema, pre-Schema-6, damaged, and storage failures; exposes Retry, library return, and diagnostic raw recovery; and allows an unchanged migrated record to upgrade only on explicit Save.
- Packaged AppImage evidence with an isolated application-data directory proved that a real Schema 10 record opens with its content, asset, page setup, and running matter intact while remaining byte-identical on disk before Save. Baseline and post-open SHA-256 are both `bc10740ec523b8a0efa5dd9fc885d811f9f02f0b68ea04dd842fe2b9d30db4a3`.
- The post-fix packaged Save/restart proof passed after the user confirmed the desktop was free. Explicit Save atomically changed the record from Schema 10 revision 2 to Schema 11 revision 3, preserved one raw Schema 10 `before-schema-upgrade` snapshot, retained Letter/landscape page setup, running matter and page-number start 7, and retained the referenced image asset. A full AppImage restart listed revision 3 with one asset and visibly reopened the same title, text, header, image, and saved state.
- Gate 1 is verified and its selective commit is authorized. Gate 2 remains pending, and the user requested that work stop immediately after the Gate 1 commit so a separate Notebook media handoff can be reviewed next.

## Gate 1 Evidence So Far

- `cargo test --manifest-path src-tauri/Cargo.toml notebook_storage --lib`: 19 passed.
- Persistence Vitest: 23 passed across contracts, IndexedDB, Tauri, and service.
- Notebook UI Vitest: 35 passed across the page, recovery screen, and library-session hook.
- `npx tsc -b --pretty false`: passed.
- Notebook-scoped ESLint: passed.
- `cargo check --manifest-path src-tauri/Cargo.toml --lib`: passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `npm run test:file-sizes`: passed after moving the new recovery-screen test into a focused file; no baseline increase.
- `npm run test:memory-protocol`: passed.
- `git diff --check`: passed.
- `npm run tauri:build`: passed before two bounded review corrections. The corrections changed only unsupported-schema recovery selection, IndexedDB upgrade-snapshot retention, and test organization; their focused Rust, IndexedDB, TypeScript, lint, file-size, and diff gates pass, so the broad build was not repeated under the resource-safe verification policy.
- Packaged Linux AppImage with isolated XDG data: Schema 10 open/no-rewrite, explicit upgrade save, raw snapshot, restart, library listing, and visible reopen passed. No Calcwiz, Vite, or Tauri verification process remains.
