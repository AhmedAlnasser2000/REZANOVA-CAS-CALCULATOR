# OOE-RS15 Completion Report

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

Implemented `OOE-RS15` as the Equation stale-commit gate over existing OOE-covered Equation routes.

## Completed Work

- Added canonical Equation OOE snapshot and input-revision helpers in the Equation mode layer.
- Extended `runEquationModeWithOoePilot` to accept the existing OOE job context options for lazy active-revision checks.
- Added ref-backed active Equation request resolution in `AppMain`.
- Enforced commit legality for symbolic Equation solves and Equation numeric-interval solves in the runtime controller.
- Preserved replay substitution snapshots when a stale numeric Equation result is dropped.
- Added tests for stable Equation snapshot hashing, stale Equation metadata, symbolic stale drops, and numeric stale drops.
- Recorded RS15-RS18 as the next traffic-controller sequence: Equation stale gate, active job registry, cancellation contract, editor runtime containment.

## Boundaries Preserved

- Non-symbolic Equation screens, coefficient polynomial tools, polynomial systems, linear systems, and algebra transforms remain unchanged.
- OOE failures remain fail-open when the active input revision still matches.
- No scheduler, cancellation, active job registry, UI trace panel, history schema, result schema, solver behavior, Rust execution, MCP diagnostics, remote execution, or Progressive Solver implementation was added.

## Verification

- `npm run test:unit -- src/lib/ooe/equation-pilot.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:unit -- src/lib/ooe/job-contract.test.ts src/lib/ooe/runtime-envelope.test.ts src/lib/ooe/expression-pilot.test.ts src/lib/ooe/table-pilot.test.ts`
- `npm run test:ooe-boundaries`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- `cargo check --manifest-path src-tauri/Cargo.toml`
