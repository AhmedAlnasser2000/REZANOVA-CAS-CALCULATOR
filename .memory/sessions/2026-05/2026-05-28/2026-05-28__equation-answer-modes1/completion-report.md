# Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: implementation and verification performed in the active 2026-05-28 session

## Task Goal

- Add explicit Equation answer modes before resuming OOE RS work.
- Let users choose between current exact symbolic solving, numeric-interval approximation, and structure-preserving isolation.
- Persist the chosen mode and show it on Equation result cards.

## What Changed

- Added persisted `equationAnswerMode` settings support with `exact`, `approximate`, and `isolate` values.
- Added Equation workspace and Settings controls for selecting the answer mode.
- Threaded answer mode through Equation runtime requests, OOE input snapshots, active request refs, history entries, and replay.
- Added visible result-card answer-mode badges for symbolic Equation results.
- Kept `Exact` as the strict symbolic solve path and now stop controlled numeric-only fallback output instead of presenting it as Exact.
- Made `Approx` intentionally use the existing numeric interval lane, return guidance when no interval is enabled, and stop when non-target symbolic parameters remain after stored-value substitution.
- Added an `Isolate` path that uses selected-target isolation as textbook formula rearrangement: it peels target-free shells and may apply the direct inverse needed to expose the selected target, including real root branches for simple powers.
- Corrected direct power priority so Exact mode prefers bounded algebraic power isolation for direct `u^3=a` and `u^4=a` before the exp/log path can add over-restrictive positive-only conditions.
- Polished Isolate even-power readback to use textbook `\pm` in the main formula while keeping explicit branch lines in details.

## Boundaries

- No broad new Equation solver family.
- No broad simplification engine.
- No fake exact answer.
- No broad Exact-mode delegation from Isolate; Isolate remains formula rearrangement, not full symbolic solving.
- No numeric-only fallback in Exact answer mode.
- No Approximate run when the substituted equation still has non-target symbolic parameters.
- No new target-containing denominator/radical isolation.
- No Equation symbolic stored-value substitution.
- No OOE scheduling, cancellation, trace-buffer, or runtime behavior change.

## Verification

- `npm run test:unit -- src/lib/app-state/settings.test.ts src/lib/modes/equation.test.ts src/lib/equation/equation-selected-target-isolation.test.ts src/lib/display/result-readback.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Follow-Ups

- Resume OOE with `OOE-RS19` once answer intent is stable in Equation snapshots.
