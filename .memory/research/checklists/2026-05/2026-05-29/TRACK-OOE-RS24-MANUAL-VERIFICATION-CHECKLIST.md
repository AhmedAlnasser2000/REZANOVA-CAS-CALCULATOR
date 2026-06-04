# TRACK-OOE-RS24 Manual Verification Checklist

## Scope

- [x] Confirm RS24 is the cooperative Table budget/cancellation pilot only.
- [x] Confirm RS25 remains the first isolated runtime pilot.
- [x] Confirm no Equation cancellation, Progressive Solver, worker/iframe/Rust host migration, history schema change, or table math behavior change was added.

## Cooperative Table Runtime

- [x] Table build runs through the OOE coordinator with a cooperative runtime context.
- [x] Completed cooperative Table builds match the synchronous `runTableMode` output.
- [x] Table build yields between row batches.
- [x] Table build checks active OOE cancellation requests at cooperative checkpoints.
- [x] Cancelled Table builds show a controlled cancellation note.
- [x] Cancelled Table builds do not replace the previous `TableResponse`.
- [x] Cancelled Table builds do not clear replay substitution snapshots.
- [x] Stale Table behavior from RS19 remains unchanged.

## OOE Metadata And Diagnostics

- [x] `table-runtime` is marked cooperative in host metadata.
- [x] `table.build` uses cooperative cancellation policy in the built-in OOE plan.
- [x] Active job registry records cooperative Table cancellation as terminal `cancelled`.
- [x] Diagnostics records completed, stale-dropped, failed, and cancelled Table jobs.
- [x] Diagnostics include checkpoint/yield/cancel trace events without storing table rows.

## Verification

- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] `npm run test:unit -- src/lib/ooe/runtime-coordinator.test.ts src/lib/ooe/active-job-registry.test.ts src/lib/ooe/diagnostics-buffer.test.ts src/lib/ooe/host-adapter.test.ts`
- [x] `npm run test:unit -- src/lib/modes/table.test.ts src/lib/ooe/table-pilot.test.ts`
- [x] `npm run test:ui -- src/app/runtime/useTableRuntime.ui.test.tsx`
- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
