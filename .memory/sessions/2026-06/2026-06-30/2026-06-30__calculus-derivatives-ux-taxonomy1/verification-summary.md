# CALCULUS-DERIVATIVES-UX-TAXONOMY1 Verification Summary

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

- `npm run test:unit -- src/lib/calculus/workspace/navigation.test.ts src/lib/calculus/workspace/ui.test.ts src/lib/calculus/derivative-target.test.ts` passed: 10 tests.
- `npm run test:ui -- src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusPartialDerivativeEditorSource.ui.test.tsx` passed: 3 tests.
- `npx tsc -b --pretty false` passed.
- `npm run test:file-sizes` passed after keeping `AppMain.tsx` within its existing ratchet cap.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Worktree Scope

- Edited Calculus navigation/taxonomy, derivative editor rail UI, derivative target-control wording, focused UI/unit tests, and required durable memory.
- No Equation, Integration, Limits, ODE, History schema, OOE, Tauri, Display result schema, or Calculate compact derivative workbench behavior changes are in this milestone.
