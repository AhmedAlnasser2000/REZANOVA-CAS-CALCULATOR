# OOE-RS30 Completion Report

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

Implemented `OOE-RS30` as the first full Equation worker runtime-shell pilot and added transient History tickets so launch order is preserved even when jobs complete out of order.

## Completed

- Added Rust/bridge metadata for `equation-worker-runtime` as a Web Worker, worker-safe, isolated, hard-stop host.
- Switched the built-in `equation.solve` plan to prefer `equation-worker-runtime` while keeping `equation-runtime` as init/unavailable fallback.
- Added a Vite module worker and client for serialized `RunEquationModeRequest` execution with worker completion, init fallback, runtime-failure, and hard-stop cancellation evidence.
- Added an isolated-worker Equation entrypoint that returns the same payload/guarded-trace shape as the existing main-thread Equation path.
- Preserved RS26/RS28 cancellation behavior: cancelled worker jobs do not commit a result card, append history, update `Ans`, or clear replay substitutions.
- Added transient pending History tickets with monotonic launch-order keys and pending-row Stop actions.
- Finalized completed jobs into the reserved History position, removed cancelled/stale tickets, and persisted optional launch-order keys only on finalized completed history entries.
- Allowed Equation completion in the background to finalize History without taking the user back to Equation or overwriting the active workspace unless the same Equation request is still current.
- Extended Equation OOE metadata/provenance with worker host execution, fallback/cancel evidence, and History ticket evidence.

## Preserved Boundaries

- No new solver capability.
- No non-Equation runtime migration.
- No OOE scheduler rewrite.
- No public diagnostics expansion.
- No Rust solver execution.
- No persisted pending History records.
- No full result/history schema rewrite.
- No retry on main thread after a worker runtime failure starts.

## Follow-Up

- Later OOE slices may generalize History launch tickets to other long-running lanes if needed.
- Later worker hardening can profile additional helper paths, but RS30 deliberately migrates only `equation.solve` as the full runtime-shell pilot.
