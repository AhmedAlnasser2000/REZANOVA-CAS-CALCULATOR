## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented `EQUATION-HISTORY-ROUTING1` as a focused UI/history gate for Equation.

- Added internal `EquationReplaySeed` support for Symbolic, polynomial equation views, linear systems, and Polynomial 2x2 systems.
- Persisted `equationScreen`/`equationSeed` when Equation outcomes are committed from normal, numeric interval, and complex region run paths.
- Updated Equation history inference and restore so saved guided records restore the original Equation screen and state before falling back to legacy result-text inference.
- Persisted `systemReadback` in history entries and restored it into replayed display outcomes so Polynomial 2x2 history rows keep clean solution-pair answer cards.
- Patched the Polynomial 2x2 multi-field focus regression by preserving the active equation field across route-level autofocus cycles and avoiding first-field ref overwrite after Equation 2 edits.
- Added focused seed, history persistence, and runtime restore coverage.

## Files Updated

- `src/types/calculator/equation-replay-types.ts`
- `src/types/calculator/runtime-types.ts`
- `src/lib/equation/equation-history.ts`
- `src/app/logic/equationHistorySeed.ts`
- `src/app/logic/equationHistorySeed.test.ts`
- `src/app/logic/runtimeControllers.ts`
- `src/app/logic/equationNumericIntervalRuntime.ts`
- `src/app/logic/equationComplexRegionRuntime.ts`
- `src/app/runtime/historyDisplayEntry.ts`
- `src/app/runtime/historyDisplayEntry.test.ts`
- `src/app/runtime/useEquationRuntime.ts`
- `src/app/runtime/useEquationRuntime.ui.test.tsx`
- `src/app/runtime/useHistoryDisplayRuntime.ts`
- `src/app/runtime/useShellFocusRuntime.ts`
- `src/app/workspaces/EquationWorkspace.tsx`
- `.task_tmp/equation-history-routing/*` for temporary visual evidence

## Notes

- Commit approval was granted after the checkpoint; the commit is path-scoped to the Equation history/focus slice.
- The shared checkout contains unrelated dirty Guide/shell/AppMain/input/linear-algebra work; this slice did not stage or revert it.
- Shared `.memory/current-state.md`, `.memory/decisions.md`, and `.memory/journal/2026-07/2026-07-04.md` contain concurrent staged edits from another lane, so this commit keeps durable task evidence in this session dossier rather than bundling unrelated shared-memory hunks.
