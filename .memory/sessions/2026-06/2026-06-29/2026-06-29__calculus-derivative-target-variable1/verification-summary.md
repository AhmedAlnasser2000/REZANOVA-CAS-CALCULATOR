# CALCULUS-DERIVATIVE-TARGET-VARIABLE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gates

- backend: `npm run test:unit -- src/lib/calculus/derivative-target.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/calculus/workspace/navigation.test.ts` passed.
- ui: `npm run test:ui -- src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/runtime/useCalculusRuntime.ui.test.tsx` passed.
- backend: `npx tsc -b --pretty false` passed.
- backend: `npm run test:file-sizes` passed.
- backend: `npm run test:memory-protocol` passed.
- backend: `git diff --check` passed.
