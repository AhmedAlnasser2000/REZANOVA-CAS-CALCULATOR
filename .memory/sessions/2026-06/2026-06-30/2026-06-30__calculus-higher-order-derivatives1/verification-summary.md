# CALCULUS-HIGHER-ORDER-DERIVATIVES1 Verification Summary

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

- `npm run test:unit -- src/lib/calculus/workspace/engine.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/derivative-operator.test.ts src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts` passed: 36 tests.

## UI Gate Evidence

- `npm run test:ui -- src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx` passed: 3 tests.
- `git diff --check` passed.

## Blocked Full Gates

- `npx tsc -b --pretty false` is blocked by unrelated Equation numeric interval work in `src/lib/modes/equation/real-periodic-interval-numeric.ts`, where `DisplayOutcome.exactLatex` is read without narrowing non-success variants.
- `npm run test:file-sizes` is blocked by unrelated runtime-controller files: `src/app/logic/runtimeControllers.ts` has 907 lines against cap 900, and `src/app/logic/runtimeControllers.test.ts` has 916 lines against cap 900.

## Worktree Scope

- Stage only the Calculus higher-order derivative evaluator, focused tests, shared Calculus evaluation type, and durable memory for this milestone.
- Do not stage unrelated Equation numeric interval memory/source work or runtime-controller work.
