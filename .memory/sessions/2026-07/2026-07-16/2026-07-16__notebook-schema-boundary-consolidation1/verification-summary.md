# NOTEBOOK-SCHEMA-BOUNDARY-CONSOLIDATION1 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: backend
- date: 2026-07-16

## Scope

- Kept Notebook Schema 14 as the current authoring/storage schema; no Schema 15 was introduced.
- Moved historical `NotebookRichDocumentV2` through `NotebookRichDocumentV13` aliases and numbered validators out of the current document type/model API and into the Notebook compatibility boundary.
- Replaced the visible migration ladder with one compatibility ingress that reads the source schema, accepts best-effort recovery Schemas 1-5, formally supports durable Schemas 6-14, then returns one strict current document.
- Added a shared V6-V14 JSON fixture set consumed by TypeScript and Rust migration checks.
- Added `npm run test:notebook-schema-compatibility` to fail on TypeScript/Rust current/minimum schema drift, unsupported durable-list drift, stale fixture-list drift, or re-export of historical numbered APIs from the current authoring files.

## Evidence

- `npm run test:notebook-schema-compatibility`
- `npx vitest run src/lib/notebook/document/model.test.ts src/lib/notebook/document/surface-state.test.ts src/lib/notebook/document/migrate-v1.test.ts src/lib/notebook/document/migrate-v2.test.ts src/lib/notebook/document/migrate-v3.test.ts src/lib/notebook/document/migrate-v4.test.ts src/lib/notebook/document/migrate-v5.test.ts src/lib/notebook/document/migrate-v6.test.ts src/lib/notebook/document/migrate-v7.test.ts src/lib/notebook/document/migrate-v8.test.ts src/lib/notebook/document/migrate-v9.test.ts src/lib/notebook/document/migrate-v10.test.ts src/lib/notebook/document/migrate-v11.test.ts src/lib/notebook/document/migrate-v12.test.ts src/lib/notebook/document/schema-compatibility.test.ts src/lib/notebook/document/floating-placement.test.ts --maxWorkers=4`
- `npx tsc -b --pretty false --incremental`
- `npx eslint src/lib/notebook/document/compatibility.ts src/lib/notebook/document/migrate.ts src/lib/notebook/document/model.ts src/lib/notebook/document/schema-compatibility.test.ts tools/notebook-schema-compatibility.mjs`

## Native storage evidence

- `cargo test --manifest-path src-tauri/Cargo.toml notebook_storage -- --nocapture` compiled and proved `notebook_storage::tests::migrates_shared_v6_through_v14_fixture_documents` plus the pure model/video-format checks, but the media-server-backed storage tests failed in this sandbox with `Operation not permitted (os error 1)` during `NotebookMediaServer::start`.
- Retrying the same command outside the sandbox was requested twice, but the automatic approval review timed out both times.
- Retrying with workspace-local `TMPDIR=/home/ahmed/Downloads/Calculator/.task_tmp/cargo-tmp` produced the same media-server permission failure.
- This gate therefore has Rust fixture/migration proof, but not a complete in-sandbox storage-suite pass.

## Notes

- V1-V5 remain TypeScript-only best-effort recovery inputs. V6-V14 are the formal durable compatibility range.
- Current authoring imports still use `NotebookRichDocument`; historical numeric names are confined to `src/lib/notebook/document/compatibility.ts`, migration files, and tests/fixtures.
- Video remains removed from the current contract; legacy video-bearing Schemas 9-13 still migrate through the existing removed-video paragraph path.
- Unrelated Linear Algebra, Calculus, symbolic-engine, result-contract, untracked media-removal dossier, and `test-results/` work remains outside this gate.
