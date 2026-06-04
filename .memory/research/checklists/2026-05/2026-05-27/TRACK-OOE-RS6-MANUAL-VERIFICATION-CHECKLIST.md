# TRACK-OOE-RS6 Manual Verification Checklist

status: completed
date: 2026-05-27
scope: OOE-RS6 internal trace and stability model

## Code Checks

- [x] Extended canonical Rust OOE trace/stability schema.
- [x] Added trace/job/stage/input-revision ID newtypes.
- [x] Added `provisional` result stability.
- [x] Added trace statuses for stale drops, cancellation, slow phases, and provisional readiness.
- [x] Added optional trace metadata for capability, host, stage, input revision, and commit decision.
- [x] Mirrored the Rust trace schema in the TypeScript OOE bridge with zod parsing.
- [x] Added deterministic TypeScript trace-event builders.
- [x] Added Equation pilot trace events for OOE preflight, guarded stage attempts, and final stable outcome.
- [x] Kept Equation visible output unchanged.

## Boundary Checks

- [x] No app-wide trace buffer.
- [x] No UI/debug trace panel.
- [x] No MCP diagnostics bridge.
- [x] No scheduling or cancellation behavior.
- [x] No stale-result commit control.
- [x] No Rust solver execution or solver migration.
- [x] No result schema or history schema changes.
- [x] No user-facing result wording or badge changes.

## Verification

- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `npm run test:unit -- src/lib/ooe/ooe-bridge.test.ts src/lib/ooe/equation-pilot.test.ts src/lib/equation/guarded-solve.test.ts src/lib/modes/equation.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
