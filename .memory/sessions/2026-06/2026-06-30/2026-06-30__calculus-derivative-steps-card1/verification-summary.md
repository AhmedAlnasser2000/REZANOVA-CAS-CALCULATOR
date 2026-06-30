# CALCULUS-DERIVATIVE-STEPS-CARD1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Backend Gate Evidence

- `npm run test:unit -- src/lib/calculus/workspace/engine.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/derivative-operator.test.ts src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts src/lib/calculus/workspace/partials.test.ts` passed: 42 tests.

## UI Gate Evidence

- `npm run test:ui -- src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusPartialDerivativeEditorSource.ui.test.tsx` passed: 5 tests.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.

## Blocked Full Gates

- `npx tsc -b --pretty false` is blocked by unrelated active Equation numeric interval work in `src/lib/equation/numeric-interval/sampling.ts`, including nullable numeric arguments and implicit `any` inference around interpolation/candidate evaluation.

## Worktree Scope

- Stage only the Calculus derivative steps implementation, focused tests, and durable memory for this milestone.
- Do not stage or modify unrelated Equation numeric interval, algebra, AppMain, or special-function work from other active agents.
