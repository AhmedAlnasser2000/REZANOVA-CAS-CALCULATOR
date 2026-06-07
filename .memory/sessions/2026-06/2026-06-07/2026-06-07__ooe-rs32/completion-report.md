# OOE-RS32 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented `OOE-RS32` as the Calculus-only OOE widening milestone. The unified visible Calculus workspace now uses canonical `calculus` identity, runs explicit evaluations through a worker-backed runtime shell, reserves pending History launch tickets, and keeps legacy `advancedCalculus` replay compatibility.

## Completed

- Added canonical `calculus` mode/history/launcher/guide/OOE identity while preserving legacy `advancedCalculus` compatibility.
- Added `calculus.evaluate` OOE capability metadata and `calculus-worker-runtime` / `calculus-runtime` host descriptors in TypeScript and Rust.
- Added a Calculus worker runtime and worker client that returns the existing `runAdvancedCalcMode` `DisplayOutcome` shape.
- Added a Calculus OOE pilot with runtime-shell evidence, selected-host/fallback/cancel metadata, launch-ticket evidence, and diagnostics provenance.
- Routed explicit Calculus runs through the worker shell, with init/unavailable fallback and no silent fallback after worker runtime failure.
- Reserved pending Calculus History tickets at launch and finalized them in launch-order position on completion.
- Removed pending Calculus tickets on cancelled/stale runs without persisting fake records.
- Preserved background-control behavior: background Calculus completion updates History without yanking the user back to Calculus or overwriting another active workspace.
- Updated app-state schemas and History replay to map legacy `advancedCalculus` entries into canonical `calculus` replay fields.
- Added targeted worker-client regression coverage for worker success, fallback, runtime failure, and cancellation.

## Preserved Boundaries

- No solver capability changed.
- No non-Calculus workspace was migrated.
- No universal History-ticket adoption was added.
- No OOE scheduler rewrite was attempted.
- No public diagnostics expansion was added.
- No Rust solver execution was added.
- No physical `src/lib/advanced-calc/*` rename was attempted.

## Follow-Up

- `OOE-RS33` should be planned from the remaining runtime-shell/ticket readiness audit instead of blindly migrating every workspace.
- Calculate, Statistics, Matrix/Vector, Trigonometry, Geometry, and Editor analysis remain deferred until each has a clear worker-safety and History-result contract.
