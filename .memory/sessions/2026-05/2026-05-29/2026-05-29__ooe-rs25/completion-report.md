# OOE-RS25 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Summary

Implemented `OOE-RS25` as the first isolated runtime pilot, using active Table build as the pilot lane and a Web Worker as the isolated host.

## Changes

- Added `table-worker-runtime` as a Rust-owned built-in host descriptor with `webWorker`, `workerSafe`, `isolated`, and `hardStop` metadata.
- Switched the built-in `table.build` OOE plan from `table-runtime` to `table-worker-runtime`.
- Kept `table-runtime` registered as the cooperative main-thread fallback host.
- Extracted pure Table execution into `src/lib/modes/table-core.ts`.
- Added `src/lib/modes/table.worker.ts` as the Vite module worker entrypoint.
- Added `src/lib/modes/table-worker-client.ts` to manage worker start, cancellation polling, fallback, failure handling, and cleanup.
- Updated the Table OOE wrapper to attempt the worker first and record worker/fallback/cancel host execution metadata in OOE envelopes and diagnostics.
- Preserved successful payload parity with `runTableMode`.

## Boundaries Preserved

- No Equation cancellation.
- No Progressive Solver behavior.
- No Rust solver execution.
- No public diagnostics UI or MCP endpoint.
- No history schema, result schema, row-limit, or Table math semantic change.
- No broader worker migration beyond the active Table build pilot.

## Next

- Post-RS25 expansion remains separate: `OOE-RS26` Equation guarded-stage cancellation checkpoints, `OOE-RS27` Equation heavy-helper isolation pilot, and `OOE-RS28` broader Equation cancellation coverage.
