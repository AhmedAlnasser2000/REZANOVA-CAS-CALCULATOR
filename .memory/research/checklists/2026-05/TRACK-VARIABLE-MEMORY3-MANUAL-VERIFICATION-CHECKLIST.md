# TRACK-VARIABLE-MEMORY3 Manual Verification Checklist

status: completed
date: 2026-05-25
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Verify stored-value mode policy is centralized as apply/ignore/unsupported.
- Verify symbolic surfaces explain ignored stored values only in detailed policy notes.
- Verify derivative-at-point protects the derivative variable while substituting non-bound parameters.
- Verify Advanced numeric/ODE surfaces protect independent/dependent variables while substituting safe parameters.
- Verify Equation symbolic solve still does not substitute stored values.

## Manual Checks

- [x] Calculate simplify/factor/expand keeps variables symbolic and records ignored stored values behind `Variable Policy`.
- [x] Equation symbolic solve keeps solve targets and symbolic parameters symbolic when stored values match.
- [x] Equation numeric solve still substitutes non-target stored values only.
- [x] Derivative at point substitutes non-bound parameters and keeps the derivative variable protected.
- [x] Advanced numeric IVP substitutes non-bound parameters and keeps ODE `x/y` protected.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/variable-memory.test.ts src/lib/modes/calculate.test.ts src/lib/modes/table.test.ts src/lib/modes/equation.test.ts src/lib/advanced-calc/engine.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:unit -- src/lib/algebra/variable-memory.test.ts src/lib/modes/calculate.test.ts src/lib/modes/table.test.ts src/lib/modes/equation.test.ts src/lib/advanced-calc/engine.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/partials.test.ts src/app/logic/runtimeControllers.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariablesPanel.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
