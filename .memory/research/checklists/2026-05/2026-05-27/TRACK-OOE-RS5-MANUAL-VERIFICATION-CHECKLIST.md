# TRACK-OOE-RS5 Manual Verification Checklist

status: completed
date: 2026-05-27
scope: OOE-RS5 guarded Equation runtime pilot

## Code Checks

- [x] Added an internal Equation OOE pilot helper.
- [x] Fetches `plan.equation.solve` through the RS4 TypeScript bridge.
- [x] Validates the fetched plan through `validateOoePlan`.
- [x] Returns fail-open diagnostic statuses:
  - `ready`
  - `unavailable`
  - `missing-plan`
  - `invalid-plan`
  - `bridge-error`
- [x] Added a traced shared guarded-solve path through `runGuardedEquationSolveWithStageOrder`.
- [x] Preserved the registered guarded Equation stage order.
- [x] Added `runEquationModeWithOoePilot(request)` returning `{ outcome, ooePilot }`.
- [x] Routed Equation symbolic controller actions through the wrapper.
- [x] Routed Equation numeric-interval controller actions through the wrapper.
- [x] Runtime controllers commit only the existing `DisplayOutcome`.

## Boundary Checks

- [x] No UI trace panel.
- [x] No user-facing result wording changes.
- [x] No badge changes.
- [x] No history/result schema changes.
- [x] No stage reordering.
- [x] No scheduler, cancellation, or stale-result commit control.
- [x] No Rust solver execution or solver migration.
- [x] No app-wide trace buffer.
- [x] No MCP diagnostics bridge.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/equation-pilot.test.ts src/lib/equation/guarded-solve.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
