# TRACK-GEOMETRY-OOE-PILOT1-RUNTIME-SHELL1-MANUAL-VERIFICATION-CHECKLIST

status: completed
date: 2026-06-10
primary_agent: codex
primary_agent_model: gpt-5.5
attribution_basis: live

## Scope

`GEOMETRY-OOE-PILOT1 + GEOMETRY-RUNTIME-SHELL1` moves explicit Geometry evaluations onto the shared OOE runtime-shell plus launch-ticket model. It does not add Geometry math capability, graphing, theorem proving, Rust solver execution, or UI taxonomy changes.

## Manual Checks

- [x] Confirmed `geometry.evaluate` uses `geometry-worker-runtime` as the primary host.
- [x] Confirmed `geometry-runtime` remains the init/unavailable fallback host.
- [x] Confirmed the Geometry worker returns the same outcome/replay payload shape as the main-thread Geometry path.
- [x] Confirmed worker init/unavailable fallback records shell evidence.
- [x] Confirmed runtime worker failure does not silently retry on the main thread.
- [x] Confirmed cancellation discards pending tickets and preserves no-commit cancelled behavior.
- [x] Confirmed explicit Geometry runs reserve pending History tickets.
- [x] Confirmed successful Geometry completion finalizes tickets in launch order with typed `geometrySeed` replay data.
- [x] Confirmed background Geometry completion can finalize History without overwriting another active workspace.
- [x] Confirmed visible Geometry output commits only when the same launched request is still current.
- [x] Confirmed OOE diagnostics include Geometry shell/ticket evidence.

## Verification Commands

```bash
npm run test:unit -- src/lib/geometry/*.test.ts src/lib/ooe/*.test.ts src/app/logic/runtimeControllers.test.ts src/lib/modes/geometry-worker-runtime.test.ts
npm run test:ui -- src/AppMain.ui.test.tsx src/components/HistoryPanel.ui.test.tsx src/components/OoeDiagnosticsPanel.ui.test.tsx
npm run test:ooe-boundaries
npm run test:memory-protocol
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Notes

Geometry now matches the mature OOE/ticket pattern used by Equation, Table, Calculus, Statistics, Linear Algebra, and Trigonometry while keeping one workspace shell that dispatches typed Geometry requests internally.
