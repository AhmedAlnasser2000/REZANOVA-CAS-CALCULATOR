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

- Passed: `npx tsx .task_tmp/equation-complex-companion/run-real-numeric-complex-companions.ts`
- Passed: `node tools/validate-equation-corpus-ledger.mjs`
- Passed: `node --test tools/validate-equation-corpus-ledger.test.mjs`
- Passed: `git diff --check`
- Passed: `npm run test:memory-protocol`

## Evidence

- Complex companion run id: `2026-07-04-openstax-algtrig-complex-companion-real-numeric1`
- Cases tested: 17 canonical Equation cases whose historical real-domain evidence used numeric fallback or exposed numeric-only failure paths.
- Supported: 11.
- Wrong result/open findings: 3.
- Unsupported/open findings: 3.
- Periodic-output finding case ids: `eq.openstax.algtrig.0156`, `eq.openstax.algtrig.0158`, `eq.openstax.algtrig.0435`.
- Unsupported finding case ids: `eq.openstax.algtrig.0124`, `eq.openstax.algtrig.0130`, `eq.openstax.algtrig.0178`.
- Wrong-result family: trig companion routes that return finite/one-cycle answers while the canonical benchmark expects periodic families.
- Unsupported family: positive numeric-base exponential equations in Complex On, currently returning `Exact answer mode could not produce a trustworthy exact closed form.`

## Notes

- No solver code was changed for this task.
- No Playwright visual verification was run because this gate changed benchmark ledger policy/data and runner evidence only; it did not change app-visible output behavior.
- The shared worktree had unrelated staged Linear Algebra files and unrelated dirty Calculus/Linear Algebra memory/source edits, so no commit was made in this checkpoint.
