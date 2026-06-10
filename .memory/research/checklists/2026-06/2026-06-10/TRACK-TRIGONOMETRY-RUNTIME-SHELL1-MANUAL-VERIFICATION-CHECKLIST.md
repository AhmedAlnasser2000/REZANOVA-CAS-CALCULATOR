# TRACK-TRIGONOMETRY-RUNTIME-SHELL1 Manual Verification Checklist

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope
- Move focused Trigonometry onto the shared OOE runtime-shell plus launch-ticket model.
- Use one workspace shell: `trigonometry-worker-runtime` primary, `trigonometry-runtime` init/unavailable fallback.
- Dispatch by typed `TrigRequest` kind inside the worker.
- Preserve `TRIGONOMETRY-SURFACE1` and typed `trigSeed` replay behavior.
- Keep Geometry deferred and add no new Trigonometry math capability.

## Manual Checks
- [ ] Trigonometry home still shows `Identities`, `Triangles`, `Angle Convert`, and `Period & Phase`.
- [ ] Running each visible Trigonometry workflow shows `Computing` instead of staying `Ready`.
- [ ] Opening History during a Trigonometry run shows a pending row with Running/Stopping state and Stop.
- [ ] Stopping from the header or pending row removes the pending ticket and creates no final history record.
- [ ] Completing a Trigonometry run finalizes the pending row in launch-order position.
- [ ] Switching to another workspace while Trigonometry runs keeps the app responsive and does not yank back on completion.
- [ ] Seeded Trigonometry replay restores the correct focused workflow.
- [ ] Legacy hidden Trig Function / Equation / Special Angles records still route forward as specified.
- [ ] OOE diagnostics show `trigonometry.evaluate`, `trigonometry-worker-runtime`, shell lifecycle, and ticket evidence.

## Verification Commands
- `npm run test:unit -- src/lib/modes/trigonometry-worker-runtime.test.ts src/lib/trigonometry/core.test.ts src/lib/ooe/workspace-pilot.test.ts`
- `npm run test:unit -- src/lib/trigonometry/*.test.ts src/lib/ooe/*.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx src/components/HistoryPanel.ui.test.tsx src/components/OoeDiagnosticsPanel.ui.test.tsx`
- `npm run test:ooe-boundaries`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
