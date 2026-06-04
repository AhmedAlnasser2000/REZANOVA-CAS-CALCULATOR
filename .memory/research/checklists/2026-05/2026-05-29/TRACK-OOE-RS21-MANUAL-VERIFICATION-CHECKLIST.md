# TRACK-OOE-RS21 Manual Verification Checklist

status: completed
date: 2026-05-29
milestone: OOE-RS21

## Scope

- [x] Added editor-analysis OOE built-in plans for variable hints, Equation target discovery, Calculate transform eligibility, Equation transform eligibility, and preview render handoff.
- [x] Registered editor-analysis plans under category `editor` with host `editor-analysis-runtime`, deterministic plan/node/phase IDs, stale-drop cancellation, `commitIfCurrent`, and conservative classic local execution metadata.
- [x] Added a TypeScript editor-analysis OOE helper that builds stable source/context/generation snapshots and runs analysis through the central OOE coordinator.
- [x] Started OOE editor-analysis jobs only after existing debounce and huge-input guards allow analysis to run.
- [x] Preserved last safe editor-analysis values when an analysis result is stale, skipped, stopped, guarded, or failed.
- [x] Migrated variable hints, Equation target discovery, Calculate transform eligibility, Equation transform eligibility, and live preview LaTeX handoff to budgeted editor-analysis lanes.
- [x] Kept Run, Stop, and Restart Editor behavior aligned with the existing editor-analysis runtime controls.
- [x] Preserved typing, canonical editor state, solver output, history behavior, result schemas, and visible math semantics.

## Verification

- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] `npm run test:unit -- src/lib/editor/editor-analysis-runtime.test.ts src/lib/ooe/ooe-bridge.test.ts src/lib/ooe/active-job-registry.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariableHintStrip.ui.test.tsx`
- [x] `npm run test:ooe-boundaries`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Notes

- RS21 budgets editor analysis only.
- Live preview budgeting controls when preview LaTeX is handed to rendering; it does not trace MathStatic internals.
- RS21 intentionally does not add solver routing, Progressive Solver behavior, worker sandboxing, Rust solver execution, trace buffer UI, MCP diagnostics, history/result schema changes, or new math capability.
