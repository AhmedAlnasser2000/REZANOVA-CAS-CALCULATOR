# TRACK-NAMED-VARIABLES2 Manual Verification Checklist

status: completed
date: 2026-05-25
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Verify Variables panel insertion for single-letter and explicit named variables.
- Verify named-variable hints distinguish explicit named tokens from raw adjacent-letter multiplication.
- Verify Equation target boundaries keep named variables out of solve-target selection.
- Verify single-letter selected-target solving still accepts explicit named variables as symbolic parameters.

## Manual Checks

- [x] Stored `mass=5` inserted from the Variables panel writes `@mass` into the editor.
- [x] Stored `x=2` inserted from the Variables panel writes raw `x`.
- [x] `@mass` and `var(mass)` are hinted as one explicit named variable.
- [x] Raw `mass` / `hello` are hinted as adjacent-letter multiplication with guidance to use `@name` or `var(name)`.
- [x] Equation symbolic `@mass=5` stops with a named-target unsupported boundary.
- [x] Equation symbolic `x+@mass=7`, target `x`, keeps `mass` as a symbolic parameter.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/named-variable.test.ts src/lib/algebra/variable-hints.test.ts src/lib/equation/equation-target.test.ts src/lib/modes/equation.test.ts src/lib/algebra/variable-memory.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariablesPanel.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
