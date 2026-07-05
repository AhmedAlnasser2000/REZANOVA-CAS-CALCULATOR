## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Completion Report

- Gate: ui.
- Milestone: Complex Equation Numeric Roadmap frontier 4, adaptive argument-principle subdivision.
- Added adaptive bounded-region subdivision for Complex Region solving. Inconclusive or unsafe cells are split breadth-first up to a depth and cell budget; verified cells aggregate contour root counts before any primary answer is shown.
- Region results now stop with controlled evidence when subdivision cannot verify root-count agreement instead of presenting residual-only candidates as primary answers.
- Added internal subdivision diagnostics and rendered `Complex Subdivision` detail cards with processed cells, split cells, verified/inconclusive/unsafe terminal counts, depth, budget, and terminal reasons.
- Added advanced manual Complex Region controls for random seeds, contour samples, subdivision depth, and cell budget. Request construction, runtime action, history replay, and benchmark evidence now preserve the new budget fields.
- Shared `.memory/current-state.md`, `.memory/decisions.md`, and `.memory/journal/2026-07/2026-07-05.md` were already dirty from other active lanes, so this gate records durable memory in this session dossier and leaves those shared files untouched.

## Files

- `src/lib/modes/equation/complex-region-subdivision.ts`
- `src/lib/modes/equation/complex-region-nonlinear-solve.ts`
- `src/lib/modes/equation/complex-region-nonlinear-solve.test.ts`
- `src/lib/modes/equation/complex-benchmark-region-runner.ts`
- `src/types/calculator/solver-types.ts`
- `src/app/logic/appUtils.ts`
- `src/app/logic/equationComplexRegionRuntime.ts`
- `src/app/logic/equationHistorySeed.test.ts`
- `src/app/logic/runtimeControllers.ts`
- `src/app/logic/runtimeControllers.test.ts`
- `src/app/runtime/equation-explicit-numeric-panels.ts`
- `src/app/runtime/equation-origin-request.ts`
- `src/app/runtime/useEquationRuntime.ts`
- `src/app/runtime/useEquationRuntime.ui.test.tsx`
- `src/app/workspaces/EquationWorkspace.tsx`
