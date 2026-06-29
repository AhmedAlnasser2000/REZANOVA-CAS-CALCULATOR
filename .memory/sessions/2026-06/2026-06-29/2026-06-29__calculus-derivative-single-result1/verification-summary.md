# CALCULUS-DERIVATIVE-SINGLE-RESULT1 Verification Summary

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

- ui: `npm run test:ui -- src/app/workspaces/CalculusDerivativeEditorSource.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx` passed.
- ui: `npm run test:ui -- src/app/shell/DisplayPanel.ui.test.tsx` passed.
- backend: `npx tsc -b --pretty false` passed.
- backend: `npm run test:file-sizes` passed.
- backend: `npm run test:memory-protocol` passed.
- backend: `git diff --check` passed.

## Notes

- Shared DisplayPanel coverage was run because this gate touches `DisplayOutcomeShell`.
