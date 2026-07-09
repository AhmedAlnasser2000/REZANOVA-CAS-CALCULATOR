# CALCULUS-DERIVATIVE-TARGET-ROUNDTRIP1 Verification Summary

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

- backend: `npm run test:unit -- src/lib/app-state/history-schema.test.ts src/lib/calculus/derivative-target.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/workspace/engine.test.ts` passed.
- ui: `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx` passed.
- backend: `npx tsc -b --pretty false` passed.
- backend: `npm run test:file-sizes` passed.
- backend: `npm run test:memory-protocol` passed.
- backend: `git diff --check` passed.

## Finding Closed

- The first focused schema run exposed that Calculus `derivativePoint` replay preserved `variable` but dropped `point`; the schema now keeps both fields.
