# Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: local command execution in the active 2026-05-28 session

## Scope

- `EQUATION-ANSWER-MODES1` settings, Equation runtime, UI controls, history/replay metadata, and textbook formula-style isolation readback.
- Follow-up fixes in the same uncommitted milestone: already-isolated power carriers now work in Isolate mode, Exact direct powers use bounded algebraic power priority before exp/log, Exact stops numeric-only fallback output, Approx stops when non-target symbolic parameters remain, and Isolate even powers display with textbook `\pm`.

## Commands

- `npm run test:unit -- src/lib/app-state/settings.test.ts src/lib/modes/equation.test.ts src/lib/equation/equation-selected-target-isolation.test.ts src/lib/display/result-readback.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Additional Focused Regression

- `npm run test:unit -- src/lib/modes/equation.test.ts src/lib/equation/equation-selected-target-isolation.test.ts src/lib/equation/equation-algebraic-isolation.test.ts src/lib/equation/equation-parameterized-exp-log.test.ts`

## Outcome

- Focused unit tests passed.
- Existing AppMain UI automation passed.
- Memory protocol, lint, production build, and Tauri cargo check passed.
