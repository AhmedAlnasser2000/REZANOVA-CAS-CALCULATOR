## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate Evidence

- `npm run test:unit -- src/lib/navigation/menu.test.ts src/app/logic/keypadRouter.test.ts src/components/MathEditor.test.ts src/lib/input/input-canonicalization.test.ts` passed.
- `npm run test:ui -- src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusPartialDerivativeEditorSource.ui.test.tsx src/app/shell/KeypadPanel.ui.test.tsx` passed.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.

## Known Unrelated Broad-Gate Issue

- `npx tsc -b --pretty false` still fails outside this derivative gate in unrelated Surface Protocol tests:
  - `src/lib/surface-protocol/dto.test.ts`
  - `src/lib/surface-protocol/spec-examples.test.ts`
