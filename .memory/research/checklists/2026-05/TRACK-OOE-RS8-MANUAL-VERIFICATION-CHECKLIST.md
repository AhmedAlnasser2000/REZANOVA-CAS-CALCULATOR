# TRACK-OOE-RS8 Manual Verification Checklist

status: completed
date: 2026-05-27
scope: OOE-RS8 table route coverage

## Code Checks

- [x] Added an internal Table OOE pilot helper.
- [x] Mapped the active Table build path to `plan.table.build`.
- [x] Fetches and validates the table plan through the RS4 TypeScript bridge.
- [x] Returns fail-open statuses:
  - `ready`
  - `unavailable`
  - `missing-plan`
  - `invalid-plan`
  - `bridge-error`
- [x] Added coarse lifecycle trace events for preflight, start, and final stable outcome.
- [x] Added `runTableModeWithOoePilot(request)`.
- [x] Kept `runTableMode(request)` unchanged.
- [x] Routed only the active `useTableRuntime` hook through the OOE wrapper.

## Boundary Checks

- [x] No visible UI trace panel.
- [x] No result wording or badge changes.
- [x] No history/result schema changes.
- [x] No stored-value, replay snapshot, warning, domain-fact, or row-output behavior changes.
- [x] No legacy `modeActionHandlers.ts` Table path changes.
- [x] No scheduling, cancellation, stale-result commit control, or Rust execution.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/table-pilot.test.ts src/lib/modes/table.test.ts src/lib/ooe/ooe-bridge.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
