# TRACK-OOE-RS7 Manual Verification Checklist

status: completed
date: 2026-05-27
scope: OOE-RS7 expression route coverage

## Code Checks

- [x] Added an internal expression OOE pilot helper.
- [x] Mapped standard Calculate actions to built-in expression plans.
- [x] Fetches and validates expression plans through the RS4 TypeScript bridge.
- [x] Returns fail-open statuses:
  - `ready`
  - `unavailable`
  - `missing-plan`
  - `invalid-plan`
  - `bridge-error`
- [x] Added coarse lifecycle trace events for preflight, start, and final stable outcome.
- [x] Added `runCalculateModeWithOoePilot(request)`.
- [x] Kept `runCalculateMode(request)` unchanged.
- [x] Routed only standard Calculate actions through the OOE wrapper.

## Boundary Checks

- [x] No visible UI trace panel.
- [x] No result wording or badge changes.
- [x] No history/result schema changes.
- [x] No stored-value or planner behavior changes.
- [x] No calculus workbench route coverage.
- [x] No advanced-calculus coverage.
- [x] No table coverage.
- [x] No algebra-tray transform coverage.
- [x] No scheduling, cancellation, stale-result commit control, or Rust execution.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/expression-pilot.test.ts src/lib/ooe/ooe-bridge.test.ts src/lib/modes/calculate.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
