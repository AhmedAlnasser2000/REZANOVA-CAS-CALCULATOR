# OOE-PILOT-SURFACE-GROUPING1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Move OOE pilot adapters and their direct tests out of the `src/lib/ooe/` root into a dedicated `pilots/` folder without behavior changes or root compatibility stubs.

## What Changed

- Created `src/lib/ooe/pilots/`.
- Moved all OOE pilot production files and direct pilot tests into the new folder.
- Updated Modes, worker-client, app-logic, pilot-test, and docs references to the new paths.
- Added `docs/architecture/ooe-pilot-surface-grouping.md`.
- Updated `docs/architecture/ooe-root-surface-audit.md` and `docs/README.md`.

## Boundaries

- Path grouping only.
- No solver behavior, display/readback policy, runtime host behavior, cancellation semantics, stale-gate behavior, diagnostics wording, schemas, capabilities, worker-host identity, replay/history contract, duplicate-launch policy, Rust/Tauri OOE, or reserved-symbol behavior changed.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: OOE-PILOT-SURFACE-GROUPING1.

## Follow-Ups

- Continue with `OOE-TRAFFIC-CONTROL-DISTRICT-AUDIT0`.
