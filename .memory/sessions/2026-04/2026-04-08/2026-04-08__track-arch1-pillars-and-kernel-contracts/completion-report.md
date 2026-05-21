# ARCH1 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Milestone: `ARCH1 — Pillars and Kernel Contracts`
- Date: `2026-04-08`
- Status: verified, not yet committed

## Scope Delivered
- Split runtime/kernel-adjacent calculator contracts out of `src/types/calculator/runtime-types.ts` into focused files:
  - `mode-types.ts`
  - `execution-types.ts`
  - `display-types.ts`
  - `solver-types.ts`
- Kept compatibility barrels stable:
  - `src/types/calculator.ts`
  - `src/types/calculator/runtime-types.ts`
- Added internal-only kernel capability metadata in `src/lib/kernel/capabilities.ts` for:
  - `expression.evaluate`
  - `expression.simplify`
  - `expression.factor`
  - `expression.expand`
  - `equation.solve`
  - `table.build`
- Added typed runtime controllers in `src/app/logic/runtimeControllers.ts` for Calculate and Equation execution seams.
- Rewired `src/AppMain.tsx` to consume typed runtime controllers and the existing primary-action router helper instead of duplicating primary routing and runtime execution logic locally.
- Thinned `src/app/logic/modeActionHandlers.ts` by delegating Calculate/Equation runtime work to the new controllers instead of retaining duplicate execution logic.
- Clarified internal execution ownership:
  - `src/lib/math-engine.ts` now uses explicit request/runtime preparation helpers
  - `src/lib/equation/guarded/run.ts` now uses one explicit staged runner helper for the guarded solve pipeline

## Behavior Notes
- Public runtime entrypoints remain stable:
  - `runExpressionAction()`
  - `buildTable()`
  - `runCalculateMode()`
  - `runEquationMode()`
- No intentional user-facing math or UI behavior changes were introduced.
- The kernel capability registry is intentionally internal-only and does not model jobs, profiles, packs, plugins, or remote execution.

## Key Files
- `src/types/calculator/runtime-types.ts`
- `src/types/calculator/mode-types.ts`
- `src/types/calculator/execution-types.ts`
- `src/types/calculator/display-types.ts`
- `src/types/calculator/solver-types.ts`
- `src/lib/kernel/capabilities.ts`
- `src/app/logic/runtimeControllers.ts`
- `src/AppMain.tsx`
- `src/app/logic/modeActionHandlers.ts`
- `src/lib/math-engine.ts`
- `src/lib/equation/guarded/run.ts`
