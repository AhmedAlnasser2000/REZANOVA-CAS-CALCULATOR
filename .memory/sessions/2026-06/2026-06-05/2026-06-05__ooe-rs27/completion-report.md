# OOE-RS27 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented `OOE-RS27` as the first Equation heavy-helper isolation slice after `OOE-RS26`.

The top-level `equation.solve` OOE job stays on the main Equation runtime, while the terminal guarded `direct-symbolic` helper can run through an isolated Web Worker host. Stop requests hard-terminate the helper worker and return the existing RS26 cancellation envelope so runtime controllers preserve visible state and history.

## Completed

- Added the Rust host descriptor `equation-direct-symbolic-worker-runtime` as a `webWorker`, `workerSafe`, `isolated`, `hardStop` helper host.
- Kept `plan.equation.solve` on `equation-runtime`; helper execution is recorded as helper-level evidence only.
- Added an Equation-local async direct-symbolic runner adapter without importing OOE types into Equation core.
- Added a Vite module worker for the guarded direct-symbolic fallback helper.
- Added a worker client that records checkpoints, falls back on worker unavailable/init/runtime failure, and hard-stops on cancellation without fallback.
- Extended guarded replay trace metadata with direct-symbolic helper host evidence.
- Extended Equation OOE trace/provenance with selected helper host, fallback, cancellation termination, and direct-symbolic stage/depth evidence.
- Preserved RS26 runtime-controller cancellation behavior: no visible cancellation card, no history append, no `Ans` update, and no replay-substitution clearing.

## Boundaries Preserved

- No full Equation solver worker migration.
- No interruption inside non-direct-symbolic helper families.
- No Rust solver execution.
- No public diagnostics UI or MCP endpoint.
- No scheduler rewrite.
- No result schema change.
- No history schema change.
- No new solver capability.

## Follow-Up

- `OOE-RS28`: broaden Equation cancellation coverage across more helper families.
- `OOE-RS29`: developer diagnostics surface or local read-only diagnostics endpoint, still to be chosen by priority.
