# RUBI-TIER1-CLOSEOUT-GATED1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Backend Gate Evidence

- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/integration-rational-partial-fractions.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts`
  - Status: passed.
  - Evidence: 5 test files passed, 103 tests passed.
- `npx tsc -b --pretty false`
  - Status: passed.
- `node tools/validate-file-sizes.mjs`
  - Status: passed.
  - Evidence: 1092 files checked, 9 baseline caps.
- `npm run test:source-mirrors`
  - Status: passed.
  - Evidence: source mirror registry validation passed 8 tests and registry validation.
- `git diff --check`
  - Status: passed.
- `npm run test:memory-protocol`
  - Status: passed after backend memory updates.
- `npx vitest run src/lib/display/result/result-readback.test.ts`
  - Status: passed.
  - Evidence: 1 test file passed, 6 tests passed.
- `npm run test:ui -- src/components/MathEditor.ui.test.tsx src/AppMain.ui.test.tsx src/app/shell/DisplayPanel.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx`
  - Status: passed.
  - Evidence: 4 test files passed, 148 tests passed.

## Final Commit-2 Gate Evidence

- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/integration-rational-partial-fractions.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/display/result/result-readback.test.ts`
  - Status: passed.
  - Evidence: 6 test files passed, 109 tests passed.
- `npm run test:ui -- src/components/MathEditor.ui.test.tsx src/AppMain.ui.test.tsx src/app/shell/DisplayPanel.ui.test.tsx src/app/workspaces/CalculusIntegralEditorSource.ui.test.tsx`
  - Status: passed after helper extraction.
  - Evidence: 4 test files passed, 148 tests passed.
- `npx tsc -b --pretty false`
  - Status: passed in clean temp worktree `.task_tmp/rubi-closeout-gated1-worktree` with the staged commit-2 patch applied.
  - Note: the live worktree command is blocked by unstaged Equation-lane files not owned by this milestone.
- `node tools/validate-file-sizes.mjs`
  - Status: passed in clean temp worktree `.task_tmp/rubi-closeout-gated1-worktree` with the staged commit-2 patch applied.
  - Note: the live worktree command is blocked by unstaged Equation-lane `src/lib/modes/equation/parameterized.ts` over cap.
- `npm run test:source-mirrors`
  - Status: passed.
- `npm run test:memory-protocol`
  - Status: passed.
- `git diff --check`
  - Status: passed.

## Notes

- No Equation-lane files were edited or staged for this milestone.
- No public Calculus result schema, Display schema, History, OOE, Tauri, persistence, Rubi metadata, or source-mirror runtime dependency changed.
- Active unrelated Equation-lane dirty files were observed after commit 1: `src/lib/modes/equation/parameterized.ts`, `src/lib/modes/equation/symbolic.ts`, `src/lib/modes/equation/complex-power-wrapper-route.ts`, and `src/lib/modes/equation/complex-power-wrapper-catchup.test.ts`.
