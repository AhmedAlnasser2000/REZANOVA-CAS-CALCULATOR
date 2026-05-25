# TRACK-VARIABLE-MEMORY2 Manual Verification Checklist

status: completed
date: 2026-05-25
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Verify stored numeric values substitute only in adopted mode paths.
- Verify active variables, bound variables, ODE `x/y`, partial derivative variables, and selected Equation targets are protected.
- Verify Equation symbolic solve still treats non-target symbols as symbolic parameters.
- Verify successful adopted runs can preserve stored-value snapshots for replay.

## Manual Checks

- [x] Table substitutes stored parameters such as `a` in `a x^2`, while leaving table variable `x` active.
- [x] Basic/Advanced Calculus substitutes stored parameters while protecting the calculus variable.
- [x] Partial derivative protects the selected derivative variable.
- [x] Equation numeric solve substitutes non-target stored parameters and protects the selected target.
- [x] Equation symbolic solve does not substitute stored values.
- [x] Stored Values detail sections remain visible on adopted runs.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/variable-memory.test.ts src/lib/modes/table.test.ts src/lib/modes/calculate.test.ts src/lib/modes/equation.test.ts src/lib/advanced-calc/engine.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/partials.test.ts src/lib/app-state/history-schema.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariablesPanel.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
