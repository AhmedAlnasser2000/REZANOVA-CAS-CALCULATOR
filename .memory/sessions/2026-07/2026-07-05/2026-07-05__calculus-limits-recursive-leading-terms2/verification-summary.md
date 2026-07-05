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

- `npm run test:unit -- src/lib/symbolic-engine/limits/finite-leading-terms.test.ts` passed: 3 tests.
- `npm run test:unit -- src/lib/symbolic-engine/limits/finite-leading-terms.test.ts src/lib/calculus/workspace/limits.test.ts` passed: 20 tests.
- `npm run test:ui -- src/app/workspaces/CalculusLimitEditorSource.ui.test.tsx` passed: 18 tests.
- `git diff --check` passed.
- `npx tsc -b --pretty false` passed.
- `npm run test:file-sizes` passed after extracting the capped local-series helper into `finite-local-series.ts`.
- `npm run test:memory-protocol` passed.
- Playwright visual check against local Vite `http://127.0.0.1:1420/` passed: `lim x -> 0 (sin(a*x)-a*x)/x^3` produced one Answer card with `-a^3/6`, and the opened Limit Method card showed the capped symbolic local-series evidence without obvious overflow.

## Visual Evidence

- `.task_tmp/calculus-limits-recursive-leading-terms2/recursive-leading-answer.png`
- `.task_tmp/calculus-limits-recursive-leading-terms2/recursive-leading-method-open.png`
- `.task_tmp/calculus-limits-recursive-leading-terms2/recursive-leading-latex-method-open.png`
- `.task_tmp/calculus-limits-recursive-leading-terms2/visual-evidence.json`
