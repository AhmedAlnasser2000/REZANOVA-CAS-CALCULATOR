# CALCULUS-INTEGRAND-EQUATION-GUARD1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Status

Implemented and verified locally as a backend Calculus input guard milestone.

## Summary

- Added an early relation-root guard in symbolic integration dispatch for `Equal`, inequalities, and related relation heads.
- Preserved the controlled relation-input error through the Calculus core while keeping generic unsupported antiderivatives on the normal Calculus unsupported message.
- Added focused symbolic-engine, Calculus core, and Calculus workspace tests for equation-like input and ordinary expression no-regression.

## Boundaries

- No Risch-Norman solving or adoption changes.
- No Display, History, OOE, Tauri, persistence, public Calculus schema, or public strategy changes.
- No UI handoff button was added for equation-like inputs.

## Files Updated

- `src/lib/symbolic-engine/integration/dispatch.ts`
- `src/lib/symbolic-engine/integration.ts`
- `src/lib/calculus/engine/integration.ts`
- `src/lib/symbolic-engine/integration.test.ts`
- `src/lib/calculus/engine/core.test.ts`
- `src/lib/calculus/workspace/integrals.test.ts`
- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-28.md`
- `.memory/sessions/2026-06/2026-06-28/2026-06-28__calculus-integrand-equation-guard1/`
