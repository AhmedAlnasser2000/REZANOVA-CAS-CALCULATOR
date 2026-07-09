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

- `npm run test:unit -- src/lib/calculus/derivative-request.test.ts src/lib/calculus/derivative-operator.test.ts src/lib/calculus/calculus-workbench.test.ts src/lib/calculus/workspace/engine.test.ts src/lib/calculus/workspace/partials.test.ts` passed.
- `npm run test:ui -- src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusPartialDerivativeEditorSource.ui.test.tsx` passed.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.

## Known Unrelated Broad-Gate Issue

- `npx tsc -b --pretty false` failed outside this gate in unrelated active work:
  - `src/lib/modes/equation/complex-numeric-polynomial-roots.ts`
  - `src/lib/surface-protocol/dto.test.ts`
  - `src/lib/surface-protocol/spec-examples.test.ts`
- These files were not changed by this derivative gate.
