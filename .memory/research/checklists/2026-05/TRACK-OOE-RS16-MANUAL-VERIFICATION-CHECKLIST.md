# TRACK-OOE-RS16 Manual Verification Checklist

status: completed
date: 2026-05-28
milestone: OOE-RS16

## Scope

- [x] Added an internal active OOE job registry with active and bounded recent lifecycle records.
- [x] Registry records include job identity, route label, lifecycle status, timestamps, commit assessment, trace events, and optional error text.
- [x] Expression, Equation, and Table OOE pilots register jobs while running and move terminal jobs into recent records.
- [x] Commit assessments map to registry lifecycle status: completed, staleDropped, or skipped.
- [x] Throwing wrapped runtimes mark registry jobs failed and rethrow.
- [x] Table remains metadata-only with no stale-commit gate.
- [x] No cancellation, scheduler, UI diagnostics, MCP endpoint, history/result schema change, result wording change, solver behavior change, Rust execution, or Progressive Solver behavior was added.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/active-job-registry.test.ts src/lib/ooe/expression-pilot.test.ts src/lib/ooe/equation-pilot.test.ts src/lib/ooe/table-pilot.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:unit -- src/lib/ooe/job-contract.test.ts src/lib/ooe/runtime-envelope.test.ts src/lib/modes/calculate.test.ts src/lib/modes/equation.test.ts src/lib/modes/table.test.ts`
- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes

- RS16 is the first OOE control-tower registry slice and remains internal/test-visible only.
- RS17 remains the next planned traffic-controller step: cancellation contract.
