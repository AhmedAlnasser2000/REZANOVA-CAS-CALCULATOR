# TRACK-OOE-RS9 Manual Verification Checklist

status: completed
date: 2026-05-27
scope: OOE-RS9 runtime envelope integration

## Code Checks

- [x] Added a shared internal OOE runtime envelope module.
- [x] Defined payload-plus-metadata envelopes as `{ payload, ooe }`.
- [x] Centralized fail-open OOE plan lookup and validation status handling.
- [x] Centralized coarse lifecycle trace construction for preflight, start, and final stable outcome.
- [x] Migrated Expression OOE pilot to the shared envelope contract.
- [x] Migrated Equation OOE pilot to the shared envelope contract while preserving guarded trace metadata.
- [x] Migrated Table OOE pilot to the shared envelope contract.
- [x] Updated runtime consumers to unwrap and commit only `payload`.

## Boundary Checks

- [x] OOE metadata remains an internal sidecar.
- [x] `DisplayOutcome` remains free of OOE trace data.
- [x] No visible UI trace panel.
- [x] No result wording or badge changes.
- [x] No history/result schema changes.
- [x] No stored-value, replay snapshot, table-row, warning, or solver behavior changes.
- [x] No trace buffer, scheduling, cancellation, stale-result commit control, or Rust execution.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/runtime-envelope.test.ts src/lib/ooe/equation-pilot.test.ts src/lib/ooe/expression-pilot.test.ts src/lib/ooe/table-pilot.test.ts src/lib/modes/equation.test.ts src/lib/modes/calculate.test.ts src/lib/modes/table.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
