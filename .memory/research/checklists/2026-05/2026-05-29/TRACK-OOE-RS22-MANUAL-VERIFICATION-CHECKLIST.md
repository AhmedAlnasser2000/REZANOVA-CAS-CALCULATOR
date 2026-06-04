# TRACK-OOE-RS22 Manual Verification Checklist

## Scope

- [ ] Confirm RS22 is diagnostics/provenance only.
- [ ] Confirm no visible result, history schema, solver behavior, scheduling, cancellation, MCP, worker, Rust solver, or Progressive Solver behavior changed.
- [ ] Confirm diagnostics records are internal/test-visible only.

## Diagnostics Buffer

- [ ] Standard Calculate actions produce diagnostics records with route, output summary, commit decision, and runtime host.
- [ ] Calculate workbench and algebra transform actions produce coarse diagnostics records.
- [ ] Equation symbolic/numeric and non-symbolic routes produce diagnostics records.
- [ ] Active Table builds produce diagnostics records without table rows.
- [ ] Advanced Calc, Trigonometry, Statistics, Geometry, Matrix, and Vector routes produce coarse diagnostics records.
- [ ] Editor-analysis lanes produce diagnostics records only after budgeted analysis runs.
- [ ] Completed, stale-dropped, skipped, and failed records are retained in the bounded buffer.

## Equation Provenance

- [ ] Equation diagnostics include answer mode when available.
- [ ] Equation diagnostics include selected target when available.
- [ ] Equation diagnostics include guarded stage attempts and winning stage/helper when available.
- [ ] Equation diagnostics include stop/error summary when a route stops.
- [ ] Equation diagnostics include generated isolation/rewrite details from existing detail sections when present.
- [ ] Equation diagnostics report display/readback hygiene status without exposing unsafe fragments.

## Boundaries

- [ ] Guide and Labs are excluded from RS22 executable-workspace provenance.
- [ ] Table provenance does not store table rows.
- [ ] OOE metadata is not added to `DisplayOutcome` or history entries.
- [ ] No public diagnostics UI, Tauri trace command, MCP endpoint, scheduler, cancellation enforcement, or host migration was added.

## Verification

- [ ] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [ ] `cargo check --manifest-path src-tauri/Cargo.toml`
- [ ] `npm run test:unit -- src/lib/ooe/diagnostics-buffer.test.ts src/lib/ooe/workspace-pilot.test.ts src/lib/ooe/runtime-coordinator.test.ts src/lib/ooe/equation-pilot.test.ts src/lib/ooe/expression-pilot.test.ts src/lib/ooe/table-pilot.test.ts`
- [ ] `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/runtime/useTableRuntime.ui.test.tsx src/lib/ooe/ooe-bridge.test.ts`
- [ ] `npm run test:ooe-boundaries`
- [ ] `npm run test:memory-protocol`
- [ ] `npm run lint`
- [ ] `npm run build`
