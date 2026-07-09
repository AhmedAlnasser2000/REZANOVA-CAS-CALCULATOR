# CALCULUS-DERIVATIVE-OPERATOR-RAIL1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## UI/Backend Gate Evidence

- `npm run test:unit -- src/lib/calculus/derivative-operator.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/workspace/partials.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/app-state/history-schema.test.ts` passed: 53 tests.
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusPartialDerivativeEditorSource.ui.test.tsx` passed: 16 tests.
- `git diff --check` passed.

## Blocked Full Gates

- `npx tsc -b --pretty false` is blocked by unrelated dirty Equation work in `src/lib/modes/equation/real-periodic-interval-numeric.ts`, where `DisplayOutcome.exactLatex` is read without narrowing non-error/prompt variants.
- `npm run test:file-sizes` is blocked by unrelated dirty runtime-controller work: `src/app/logic/runtimeControllers.ts` has 907 lines against cap 900, and `src/app/logic/runtimeControllers.test.ts` has 916 lines against cap 900.
- This milestone's previously over-cap `src/types/calculator/runtime-types.ts` expansion was compacted back to 1333 lines, below its cap of 1341.

## Worktree Scope

- Stage only the Calculus operator-rail files, focused tests, styles, app-state schema update, and durable memory for this milestone.
- Do not stage unrelated Equation, runtime-controller, Equation workspace, or symbolic integration certificate files from other active work.
