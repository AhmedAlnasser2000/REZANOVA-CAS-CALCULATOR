# SYMBOLIC-DIFFERENTIATION-PREFLIGHT1 Verification Summary

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

- backend: `npm run test:unit -- src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/engine.test.ts` passed.
- backend: `npx tsc -b --pretty false` passed.
- backend: `npm run test:unit -- src/lib/symbolic-engine/differentiation.test.ts src/lib/symbolic-engine/differentiation-preflight.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/calculus/workspace/navigation.test.ts src/app/runtime/useCalculusRuntime.ui.test.tsx` passed for the unit-config collected files.
- ui: `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx` passed.
- backend: `npm run test:file-sizes` passed.
- backend: `npm run test:memory-protocol` passed.
- backend: `git diff --check` passed.

## Notes

- The unit config does not collect `*.ui.test.tsx`; `useCalculusRuntime.ui.test.tsx` was verified under the UI command.
