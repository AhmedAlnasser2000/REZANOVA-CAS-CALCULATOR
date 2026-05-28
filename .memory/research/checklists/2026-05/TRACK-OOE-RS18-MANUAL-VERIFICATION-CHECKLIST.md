# TRACK-OOE-RS18 Manual Verification Checklist

status: completed
date: 2026-05-28
milestone: OOE-RS18

## Scope

- [x] Added a current-lane editor runtime control helper for standard Calculate, Equation symbolic, and active Table OOE lanes.
- [x] `Run` resumes editor analysis and executes the existing primary action path.
- [x] `Stop` pauses editor analysis and requests RS17 cancellation for the latest active current-lane OOE job.
- [x] `Stop` on non-OOE surfaces only pauses editor analysis.
- [x] `Restart Editor` requests current-lane cancellation, clears the active draft/result state, increments the editor generation, remounts MathEditor, and resumes analysis.
- [x] Added MathEditor containment with a fallback restart action for render crashes.
- [x] Contained long History math entries with local horizontal scrolling so oversized saved results do not spill across the panel.
- [x] Added a renderer-side fallback for stale persisted internal symbolic error fragments; deeper product-normalization polish remains follow-up.
- [x] Preserved MathLive typing, keypad routing, paste, variable hints, and existing analysis behavior.
- [x] Preserved RS14/RS15 stale gates and RS17 advisory cancellation behavior.
- [x] No hard solver interruption, scheduler, worker/iframe sandbox, Rust solver execution, trace panel, MCP diagnostics, history/result schema change, or solver output change was added.

## Verification

- [x] `npm run test:unit -- src/app/logic/editorRuntimeControl.test.ts src/lib/editor/editor-analysis-runtime.test.ts src/lib/ooe/active-job-registry.test.ts src/app/logic/runtimeControllers.test.ts src/lib/ooe/job-contract.test.ts src/lib/algebra/variable-core.test.ts src/lib/modes/equation.test.ts`
- [x] `npm run test:ui -- src/components/MathStatic.ui.test.tsx src/components/MathEditor.ui.test.tsx src/AppMain.ui.test.tsx`
- [x] `npm run test:ooe-boundaries`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Notes

- RS18 is the first visible OOE control-lane milestone, but cancellation requests remain advisory for current one-shot TypeScript work.
- OOE snapshot canonicalization now skips undefined optional fields so equivalent route requests do not produce false stale drops.
- Replayed the current persisted desktop Equation history entries before close; the product-heavy saved entries now re-run cleanly in the checked cases, and old stored black-square fragments are contained in display.
