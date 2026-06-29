# CALCULUS-DERIVATIVE-EDITOR-SOURCE1 Verification Summary

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

- ui: `npm run test:unit -- src/lib/calculus/workspace/navigation.test.ts` passed.
- ui: `npm run test:ui -- src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx` passed.

## Notes

- The unit test command that included `src/app/runtime/useCalculusRuntime.ui.test.tsx` under the unit config collected only the non-UI navigation suite, so the runtime UI hook coverage was rerun under `npm run test:ui`.
- Derivative expression-preview suppression is intentionally not verified here because it belongs to `CALCULUS-DERIVATIVE-SINGLE-RESULT1`.
