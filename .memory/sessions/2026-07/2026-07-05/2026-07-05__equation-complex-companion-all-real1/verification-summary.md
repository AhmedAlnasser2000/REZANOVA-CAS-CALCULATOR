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

- Passed: `npx tsx .task_tmp/equation-complex-companion/run-all-real-complex-companions.ts`
- Passed: `node tools/validate-equation-corpus-ledger.mjs`
- Passed: `node --test tools/validate-equation-corpus-ledger.test.mjs`
- Passed: `git diff --check`
- Passed: `npm run test:memory-protocol`
- Passed: `npx playwright test .task_tmp/equation-complex-companion/complex-companion-visual.spec.ts --config .task_tmp/equation-complex-companion/playwright.manual.config.ts`

## Evidence

- Complex companion run id: `2026-07-05-openstax-algtrig-complex-companion-all-real1`
- Scope: all 434 real-domain canonical Equation corpus cases.
- Supported: 414.
- Wrong result/open findings: 8, all `needs-periodic-output`.
- Unsupported/open findings: 12, all `needs-complex-support`.
- Superseded finding prefix: `find.openstax.algtrig.complex-companion-real-numeric1.`
- Added validator regression: a Complex companion run result cannot use its own `run_id` as `companion_of_run_id`.
- Visual evidence covered supported Complex-On root rendering, a periodic-output finding card, and a controlled unsupported positive-base exponential error card.
- Screenshots were written under `.task_tmp/equation-complex-companion/screenshots/`.

## Notes

- No solver code was changed for this task.
- First Playwright attempt against the preview config timed out waiting for `127.0.0.1:4173`; the passing run reused the active Vite dev server at `127.0.0.1:1420`.
