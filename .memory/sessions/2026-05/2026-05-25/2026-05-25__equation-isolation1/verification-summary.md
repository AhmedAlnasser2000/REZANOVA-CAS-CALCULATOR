# EQUATION-ISOLATION1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: direct

## Status

- status: completed
- date: 2026-05-25

## Commands Passed

- `npm run test:unit -- src/lib/equation/equation-selected-target-isolation.test.ts src/lib/modes/equation.test.ts src/lib/equation/equation-parameterized-readback.test.ts`
- `npm run test:unit -- src/lib/equation/equation-selected-target-isolation.test.ts src/lib/modes/equation.test.ts src/lib/equation/equation-parameterized-exp-log.test.ts src/lib/equation/equation-parameterized-rational.test.ts src/lib/equation/equation-parameterized-composition.test.ts src/lib/equation/equation-parameterized-readback.test.ts src/lib/equation/equation-target.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run test:golden`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Result

- All planned verification commands passed.
