# TRACK-OOE-RS15 Manual Verification Checklist

status: completed
date: 2026-05-28
milestone: OOE-RS15

## Scope

- [x] Equation OOE snapshots are canonicalized through shared helpers in the Equation mode layer.
- [x] `runEquationModeWithOoePilot` accepts lazy active-revision options while preserving payload parity.
- [x] Symbolic Equation OOE routes enforce commit legality through the RS12/RS13 commit assessment.
- [x] Equation numeric-interval OOE routes enforce commit legality through the RS12/RS13 commit assessment.
- [x] Stale Equation results are silently dropped instead of committing.
- [x] Stale numeric Equation drops preserve replay substitution snapshots.
- [x] OOE unavailable, missing-plan, invalid-plan, and bridge-error states remain fail-open when the active revision still matches.
- [x] Non-symbolic Equation screens and algebra transforms remain outside RS15.
- [x] No cancellation, scheduler, active job registry, UI trace panel, history schema, result schema, solver behavior, Rust execution, MCP diagnostics, or Progressive Solver behavior was added.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/equation-pilot.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:unit -- src/lib/ooe/job-contract.test.ts src/lib/ooe/runtime-envelope.test.ts src/lib/ooe/expression-pilot.test.ts src/lib/ooe/table-pilot.test.ts`
- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes

- RS15 is the second real commit-legality enforcement slice, intentionally limited to Equation symbolic and numeric-interval OOE routes.
- RS16 is the next planned traffic-controller step: active job registry.
