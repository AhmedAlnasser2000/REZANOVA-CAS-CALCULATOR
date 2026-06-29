# CALCULUS-PARTIAL-DERIVATIVE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gates

- backend: `npm run test:unit -- src/lib/calculus/workspace/partials.test.ts src/lib/symbolic-engine/partials.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/calculus/workspace/navigation.test.ts src/lib/app-state/history-schema.test.ts src/lib/engine/math-engine/calculus.test.ts` passed.
- ui: `npm run test:ui -- src/app/workspaces/CalculusPartialDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/runtime/useCalculusRuntime.ui.test.tsx` passed.
- backend: `npx tsc -b --pretty false` passed.
- backend: `npm run test:file-sizes` passed after slimming `src/app/runtime/useCalculusRuntime.ts` back to its 900-line cap.
- backend: `npm run test:memory-protocol` passed.
- backend: `git diff --check` passed.
