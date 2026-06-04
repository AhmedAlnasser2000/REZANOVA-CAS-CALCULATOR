# TRACK-OOE-RS25 Manual Verification Checklist

## Scope

- [x] Confirm RS25 is the first isolated runtime pilot only.
- [x] Confirm active Table build is the only isolated pilot lane.
- [x] Confirm Equation cancellation remains post-RS25 expansion work.
- [x] Confirm no Progressive Solver behavior, Rust solver execution, history schema change, result schema change, row-limit change, or Table math semantic change was added.

## Host Metadata

- [x] `table-worker-runtime` is registered as a Web Worker host.
- [x] `table-worker-runtime` uses `workerSafe`, `isolated`, and `hardStop` metadata.
- [x] `table-runtime` remains registered as the cooperative main-thread fallback host.
- [x] The built-in `table.build` plan references `table-worker-runtime`.
- [x] Built-in OOE plans still validate.

## Worker Runtime

- [x] Pure Table execution is available without importing OOE, React, hooks, or UI code.
- [x] The Table module worker returns serialized `TableModeResult` payloads.
- [x] Worker completion matches synchronous `runTableMode` output.
- [x] Worker cancellation terminates the worker and returns the controlled Table cancellation note.
- [x] Worker startup/runtime failure falls back to the cooperative main-thread Table path.
- [x] Worker listeners, timers, and worker instances are cleaned up on completion, cancellation, fallback, and failure.

## Table Behavior

- [x] Completed Table jobs still commit normal result and response through existing hook behavior.
- [x] Stale Table jobs still silently drop through RS19 behavior.
- [x] Cancelled Table jobs still commit only the cancellation note, preserve previous rows, and avoid replay-snapshot clearing.
- [x] Diagnostics/provenance record worker/fallback/cancellation host execution metadata without storing table rows.

## Verification

- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] `npm run test:unit -- src/lib/ooe/host-adapter.test.ts src/lib/ooe/ooe-bridge.test.ts src/lib/ooe/runtime-coordinator.test.ts src/lib/ooe/diagnostics-buffer.test.ts`
- [x] `npm run test:unit -- src/lib/modes/table.test.ts src/lib/ooe/table-pilot.test.ts`
- [x] `npm run test:ui -- src/app/runtime/useTableRuntime.ui.test.tsx`
- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
