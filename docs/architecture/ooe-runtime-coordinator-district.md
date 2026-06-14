# OOE Runtime Coordinator District

Status: final split record

Purpose: group OOE runtime execution, runtime envelopes, host adapter evidence, shell contracts, and trace helpers outside the OOE root while preserving traffic-control behavior.

## District Shape

- `src/lib/ooe/runtime-control/runtime-coordinator.ts` owns runtime job execution, cooperative cancellation checkpoints, active-job lifecycle handoff, diagnostics recording, and final envelope construction.
- `src/lib/ooe/runtime-control/runtime-envelope.ts` owns pilot definition/status contracts, runtime metadata, plan preflight, lifecycle trace events, and envelope assembly.
- `src/lib/ooe/runtime-control/runtime-shell-contract.ts` owns runtime-shell evidence and diagnostics line formatting.
- `src/lib/ooe/runtime-control/host-adapter.ts` owns host descriptor resolution, host support checks, and host diagnostics summaries.
- `src/lib/ooe/runtime-control/trace.ts` owns OOE trace event construction.

## Preserved Contracts

- Runtime envelopes, metadata, completion shape, host adapter summaries, runtime shell evidence lines, and trace event fields are unchanged.
- Stale-drop and cancellation behavior remain delegated through the existing job-launch contract and active job registry.
- Diagnostics recording keeps the same terminal status mapping, provenance shape, and failure handling.
- Pilot adapters keep their existing plan ids, host ids, capability ids, node ids, phase ids, and runtime evidence.

## Consumers

Grouped pilots, Modes worker clients, mode runners, editor analysis, diagnostics buffer, and OOE tests now import the runtime coordinator district directly.

## Stop Rules

- Do not add root compatibility stubs for moved OOE internals.
- Do not add a generic runtime framework or event bus.
- Do not change runtime host behavior, stale-gate behavior, cancellation semantics, diagnostics wording, schemas, capabilities, replay/history contracts, or Rust/Tauri OOE parity.
