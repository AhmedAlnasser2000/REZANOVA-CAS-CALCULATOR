# CALCULUS-MIXED-PARTIALS1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Backend Gate Evidence

- `npm run test:unit -- src/lib/calculus/workspace/engine.test.ts src/lib/calculus/workspace/partials.test.ts src/lib/calculus/derivative-operator.test.ts src/lib/symbolic-engine/partials.test.ts src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts` passed: 37 tests.

## UI Gate Evidence

- `npm run test:ui -- src/app/workspaces/CalculusPartialDerivativeEditorSource.ui.test.tsx` passed: 2 tests.
- `git diff --check` passed.

## Blocked Full Gates

- `npx tsc -b --pretty false` remains blocked by unrelated Equation numeric interval work in `src/lib/modes/equation/real-periodic-interval-numeric.ts`, where `DisplayOutcome.exactLatex` is read without narrowing non-success variants.
- `npm run test:file-sizes` remains blocked by unrelated runtime-controller files: `src/app/logic/runtimeControllers.ts` has 907 lines against cap 900, and `src/app/logic/runtimeControllers.test.ts` has 916 lines against cap 900.

## Worktree Scope

- Stage only the Calculus mixed-partial evaluator, focused tests, and durable memory for this milestone.
- Do not stage or modify unrelated Equation numeric interval or runtime-controller work.
