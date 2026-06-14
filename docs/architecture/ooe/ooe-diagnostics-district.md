# OOE Diagnostics District

Status: final split record

Purpose: group OOE diagnostics records, output summaries, inspector row assembly, evidence lines, and panel-facing serialization outside the OOE root while preserving diagnostics behavior.

## District Shape

- `src/lib/ooe/diagnostics/diagnostics-buffer.ts` owns diagnostics record lifecycle, retention, cloning, output summaries, provenance shape, and clear/list/latest helpers.
- `src/lib/ooe/diagnostics/diagnostics-inspector.ts` owns diagnostics/active/recent row merge, status/query filtering, newest-first ordering, evidence line assembly, duration labels, and raw serialization.

## Preserved Contracts

- Terminal status strings, output summary fields, provenance fields, unsafe marker detection, and diagnostics ids remain unchanged.
- Runtime shell evidence lines, cancellation/helper-host/final-trace/error lines, duration labels, and raw JSON serialization remain unchanged.
- Diagnostics records continue to be cloned before returning to callers.
- Retention defaults and clear-limit override behavior remain unchanged.

## Consumers

Runtime control records diagnostics, pilots summarize Display outcomes, worker runtime tests assert failure diagnostics, and `OoeDiagnosticsPanel` consumes the district directly.

## Stop Rules

- Do not add root compatibility stubs for moved OOE internals.
- Do not change panel UI, filtering behavior, retention policy, diagnostics wording, runtime-control behavior, duplicate-launch policy, schemas, Rust/Tauri OOE, or Display readback behavior in this district.
