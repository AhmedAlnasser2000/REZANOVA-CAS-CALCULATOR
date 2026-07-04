## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

- Passed: `npx vitest run src/app/logic/equationHistorySeed.test.ts src/lib/equation/equation-history.test.ts src/app/runtime/historyDisplayEntry.test.ts`
- Passed: `npm run test:ui -- src/app/runtime/useEquationRuntime.ui.test.tsx`
- Passed: `git diff --check`
- Passed: `npm run test:file-sizes`
- Passed: `npm run test:memory-protocol`
- Passed visual check after manually starting Vite on `127.0.0.1:4173`: `npx playwright test --config .task_tmp/equation-history-routing/playwright.visual.config.ts .task_tmp/equation-history-routing/equation-history-routing.visual.spec.ts`
- Visual evidence:
  - `.task_tmp/equation-history-routing/screenshots/01-polynomial-2x2-before-replay.png`
  - `.task_tmp/equation-history-routing/screenshots/02-polynomial-2x2-after-history-replay.png`
  - `.task_tmp/equation-history-routing/screenshots/03-polynomial-2x2-second-field-focus.png`

## Blockers

- Blocked by unrelated dirty `src/AppMain.tsx`: `npx tsc -b --pretty false` fails with `src/AppMain.tsx(155,8): error TS6133: 'StatisticsScreen' is declared but its value is never read.`
- First Playwright attempt through the webServer wrapper timed out; manual Vite startup succeeded and the same spec passed against the running server.
