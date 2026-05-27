# TRACK-OOE-RS14 Manual Verification Checklist

status: completed
date: 2026-05-27
milestone: OOE-RS14

## Scope

- [x] Standard Calculate OOE snapshots are canonicalized through shared helpers in the Calculate mode layer.
- [x] OOE job commit context can resolve the active input revision lazily at metadata-build time.
- [x] Standard Calculate actions enforce commit legality through the RS12/RS13 commit assessment.
- [x] Stale standard Calculate results are silently dropped instead of committing.
- [x] Stale standard Calculate drops preserve replay substitution snapshots.
- [x] OOE unavailable, missing-plan, invalid-plan, and bridge-error states remain fail-open when the active revision still matches.
- [x] Calculate workbench and algebra-transform routes remain outside RS14.
- [x] Equation and Table pilots remain metadata-only and do not enforce stale-result gates.
- [x] No cancellation, scheduler, UI trace panel, history schema, result schema, solver behavior, Rust execution, MCP diagnostics, or Progressive Solver behavior was added.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/job-contract.test.ts src/lib/ooe/runtime-envelope.test.ts src/lib/ooe/expression-pilot.test.ts src/lib/modes/calculate.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:unit -- src/lib/ooe/equation-pilot.test.ts src/lib/ooe/table-pilot.test.ts src/lib/modes/equation.test.ts src/lib/modes/table.test.ts`
- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes

- RS14 is the first real commit-legality enforcement slice, intentionally limited to standard Calculate.
- RS15 remains a decision point: Equation stale gating or cancellation-contract metadata.
