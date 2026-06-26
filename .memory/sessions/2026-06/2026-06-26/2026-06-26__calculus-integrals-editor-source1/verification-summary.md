# CALCULUS-INTEGRALS-EDITOR-SOURCE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: ui

## Evidence

- Verified Calculus Indefinite Integral editing now uses `main-editor`, F2 is labeled `Focus Editor`, and no lower `.secondary-mathfield` integrand editor is present.
- Verified Copy Expr copies the generated integral request while Copy Result copies the structured result.
- Verified running an indefinite integral leaves the main editor on the input integrand and renders only one structured `Answer` block.
- Verified Definite and Improper Integral bounds remain editable in the lower workspace while the integrand body comes from the main editor.
- Verified the existing guided Calculus history replay test restores Indefinite Integral body state into `main-editor`.

## Verification Commands

- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:ui -- src/AppMain.ui.test.tsx src/app/shell/DisplayPanel.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx`
- Passed: `git diff --check`
- Passed: `npm run test:memory-protocol`

## Commit Status

- Dedicated UI commit proceeding by user instruction after memory-protocol verification.
- Worktree was clean before this UI milestone started; staged diff will include only this milestone and required durable memory.
