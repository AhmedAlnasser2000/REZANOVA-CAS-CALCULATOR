# TRACK-NAMED-VARIABLES1 Manual Verification Checklist

status: completed
date: 2026-05-25
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Verify explicit named-variable syntax works through `@name` and `var(name)`.
- Verify raw adjacent letters remain multiplication and receive guidance.
- Verify Variables panel accepts raw single-letter names but requires explicit syntax for multi-character names.
- Verify stored named values follow existing stored-value mode policies.
- Verify Equation symbolic solve continues to ignore stored values.

## Manual Checks

- [x] `@mass+2` with stored `mass=5` evaluates through stored-value substitution.
- [x] Raw `mass+2` does not substitute stored `mass` and is treated as adjacent-letter input.
- [x] `var(mass)` and `@mass` normalize to the same stored variable.
- [x] `@Rate` and `@rate` are distinct.
- [x] Variables panel rejects raw `mass` and accepts `@mass` / `var(mass)`.
- [x] Equation symbolic with stored `@mass=5` keeps `mass` symbolic and explains stored-value ignoring.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/variable-core.test.ts src/lib/algebra/variable-memory.test.ts src/lib/algebra/variable-hints.test.ts src/lib/modes/calculate.test.ts src/lib/modes/table.test.ts src/lib/modes/equation.test.ts src/lib/advanced-calc/engine.test.ts src/lib/app-state/history-schema.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariablesPanel.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
