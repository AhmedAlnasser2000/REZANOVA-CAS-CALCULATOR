# EQUATION-CORPUS-ALGTRIG-SCAN2-FIX1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Commands

- `npx vite-node .task_tmp/equation-corpus-scan2/probe-canonicalization.ts && npx vite-node .task_tmp/equation-corpus-scan2/probe-fix-cases.ts`
  - Passed; verified the 18 scan2 findings now resolve to supported symbolic answers except the corrected no-real-solution row.
- `npx vitest run src/lib/input/input-canonicalization.test.ts src/lib/modes/equation/equation-corpus-algtrig-fixes.test.ts src/lib/equation/parameterized/trig.test.ts src/lib/equation/parameterized/exp-log.test.ts`
  - Passed; 4 files, 90 tests.
- `npx vite-node .task_tmp/equation-corpus-scan2/record-fix-run.ts && node tools/validate-equation-corpus-ledger.mjs`
  - Passed; recorded 18 fix-run rows and validated the ledger totals.
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
  - Passed; 5 tests after updating the committed run-result count to 224.
- `node tools/validate-equation-corpus-ledger.mjs`
  - Passed; ledger has 10 sources, 200 unique cases, 40 duplicate records, 224 run results, and 24 scan findings.
- `npx playwright test --config .task_tmp/equation-corpus-scan2/playwright.visual.config.ts`
  - Passed after tightening the trig checks to target the quick-setting angle control; 6 browser tests.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --check -- src/lib/equation/parameterized/exp-log-core.ts src/lib/equation/parameterized/trig-direct.ts src/lib/input/input-canonicalization.ts src/lib/input/input-canonicalization.test.ts src/lib/modes/equation/equation-corpus-algtrig-fixes.test.ts src/lib/modes/equation/symbolic-parameterized-exact.ts src/lib/modes/equation/symbolic.ts src/lib/trigonometry/rewrite/cos-double-angle.ts src/lib/trigonometry/rewrite/run.ts src/types/calculator/runtime-types.ts benchmarks/equation-corpus/ledger/run-results.jsonl benchmarks/equation-corpus/ledger/scan-findings.jsonl benchmarks/equation-corpus/ledger/unique-cases.jsonl`
  - Passed.

## Playwright Evidence

Fresh screenshots inspected:

- `.task_tmp/equation-corpus-scan2/screenshots/fixed-exp-log-card.png`
- `.task_tmp/equation-corpus-scan2/screenshots/fixed-pasted-abs-card.png`
- `.task_tmp/equation-corpus-scan2/screenshots/fixed-trig-identity-card.png`

Observed visual state:

- Fixed exp/log answer card shows `x = 2 + ln(5)` with the exp/log detail card readable.
- Pasted abs answer card shows two exact answer rows and the resolved absolute-value form.
- Trig identity answer card in RAD shows the periodic family `pi/4 + pi n` and `n in Z` without overlap.

## Notes

- The first RAD Playwright rerun failed because `getByRole('button', { name: 'DEG' })` matched both the quick setting and keypad key. The spec was narrowed to `quick-setting-angle-unit`, then the full visual gate passed.
- The recurring Node warning about `NO_COLOR` being ignored when `FORCE_COLOR` is set appeared during commands and was non-fatal.
