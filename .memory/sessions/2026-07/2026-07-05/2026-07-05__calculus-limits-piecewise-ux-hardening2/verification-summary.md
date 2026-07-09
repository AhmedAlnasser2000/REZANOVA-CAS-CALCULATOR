## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

- `npm run test:unit -- src/lib/calculus/limit-piecewise-row-editor.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/symbolic-engine/limits/piecewise-limits.test.ts` passed: 35 tests.
- `npm run test:ui -- src/app/workspaces/CalculusLimitEditorSource.ui.test.tsx` passed: 15 tests.
- Playwright visual check against local Vite `http://127.0.0.1:1421/` passed: row editor preserved `x < 0`, readback rendered cases, evaluation produced one visible answer card with `0`, and screenshots were written under `.task_tmp/calculus-limits-piecewise-ux-hardening2/`.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.
- `npx tsc -b --pretty false` was attempted and remains blocked by unrelated pre-existing `src/AppMain.tsx(156,8)` unused `StatisticsScreen` outside this Limits slice.

## Visual Evidence

- `.task_tmp/calculus-limits-piecewise-ux-hardening2/piecewise-row-editor-spaced-condition.png`
- `.task_tmp/calculus-limits-piecewise-ux-hardening2/piecewise-row-editor-answer.png`
- `.task_tmp/calculus-limits-piecewise-ux-hardening2/playwright-visual-evidence.txt`
