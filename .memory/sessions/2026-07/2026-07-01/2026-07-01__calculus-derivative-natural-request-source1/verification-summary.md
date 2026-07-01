## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate Evidence

- `npm run test:unit -- src/lib/app-state/history-schema.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/calculus/workspace/partials.test.ts src/lib/guide/content.test.ts src/lib/calculus/workspace/navigation.test.ts src/lib/navigation/menu.test.ts` passed.
- `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusPartialDerivativeEditorSource.ui.test.tsx` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Known Unrelated Broad-Gate Issue

- `npx tsc -b --pretty false` still fails outside this derivative gate in unrelated Surface Protocol tests:
  - `src/lib/surface-protocol/dto.test.ts`
  - `src/lib/surface-protocol/spec-examples.test.ts`
