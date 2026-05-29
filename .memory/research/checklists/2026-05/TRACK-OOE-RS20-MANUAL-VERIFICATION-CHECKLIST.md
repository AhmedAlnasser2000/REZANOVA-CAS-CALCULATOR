# TRACK-OOE-RS20 Manual Verification Checklist

status: completed
date: 2026-05-29
milestone: OOE-RS20

## Scope

- [x] Added a central internal OOE runtime coordinator for existing OOE-covered lanes.
- [x] Coordinator owns job identity start, active job registry start, plan preflight, runtime execution, post-run commit assessment, registry completion/failure, and envelope return.
- [x] Active input revisions are resolved after runtime execution so edits during a job can still stale-drop.
- [x] Migrated standard Calculate expression pilot to the coordinator while preserving public wrapper APIs.
- [x] Migrated Equation OOE pilot paths to the coordinator while preserving guarded stage trace metadata.
- [x] Migrated active Table build pilot to the coordinator while preserving payload/response behavior.
- [x] Preserved Calculate, Equation, and Table stale-gate consumers.
- [x] Preserved visible output, history behavior, answer-mode behavior, and solver behavior.
- [x] Updated the OOE boundary validator to classify the coordinator as OOE core.

## Verification

- [x] `npm run test:unit -- src/lib/ooe/runtime-coordinator.test.ts src/lib/ooe/runtime-envelope.test.ts src/lib/ooe/expression-pilot.test.ts src/lib/ooe/equation-pilot.test.ts src/lib/ooe/table-pilot.test.ts src/lib/ooe/job-contract.test.ts src/lib/ooe/active-job-registry.test.ts`
- [x] `npm run test:unit -- src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:ui -- src/app/runtime/useTableRuntime.ui.test.tsx`
- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`

## Notes

- RS20 is lifecycle consolidation only.
- RS20 intentionally does not add a scheduler, budget policy, trace buffer, MCP diagnostics, Rust solver execution, worker isolation, Progressive Solver behavior, UI changes, result schema changes, or new math capability.
