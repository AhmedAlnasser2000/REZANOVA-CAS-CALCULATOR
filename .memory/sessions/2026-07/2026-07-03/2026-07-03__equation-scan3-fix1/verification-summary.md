# EQUATION-SCAN3-FIX1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verification

Passed:

- `npx vitest run src/lib/modes/equation/equation-corpus-algtrig-fixes.test.ts src/lib/modes/equation/systems-guided-polynomial.test.ts src/lib/equation/solution/constraints.test.ts src/lib/equation/parameterized/exp-log.test.ts`
- `node tools/validate-equation-corpus-ledger.mjs`
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
- `npx playwright test -c .task_tmp/equation-corpus-scan3/playwright.visual.config.ts .task_tmp/equation-corpus-scan3/equation-scan3-visual.spec.ts`

Scan evidence:

- `.task_tmp/equation-corpus-scan3/run-openstax-next250.ts` rerun summary: 250 cases, 250 supported, 0 wrong result, 0 unsupported, 60 duplicate sightings not rerun independently.
- `benchmarks/equation-corpus/ledger/run-results.jsonl` gained run `2026-07-03-openstax-algtrig-scan3-fix1`.
- `benchmarks/equation-corpus/ledger/scan-findings.jsonl` has 0 open scan3 findings after this gate: 47 fixed, 3 superseded, 2 not-reproduced.

Playwright visual coverage:

- Rational exclusions: `.task_tmp/equation-corpus-scan3/screenshots/rational-composition-exclusions.png`
- Trig exact periodic card: `.task_tmp/equation-corpus-scan3/screenshots/trig-quadratic-exact-periodic.png`
- Exp/log exact card: `.task_tmp/equation-corpus-scan3/screenshots/exp-log-natural-quotient.png`
- Radical candidate evidence: `.task_tmp/equation-corpus-scan3/screenshots/radical-candidate-evidence.png`
- Nested log/exp composition: `.task_tmp/equation-corpus-scan3/screenshots/nested-log-exp-composition.png`
- Existing simultaneous system screen: `.task_tmp/equation-corpus-scan3/screenshots/simultaneous-polynomial-system-card.png`

Notes:

- Extra check `npx tsc -b --pretty false` was attempted after the helper extraction. It is blocked by unrelated `src/app/runtime/historyDisplayEntry.test.ts` readonly `lineKinds` typing; no scan3 files were reported after the local typing fixes.
- The recurring `NO_COLOR`/`FORCE_COLOR` Node warning appeared during commands and did not affect passing exit statuses.
- The first Playwright attempt timed out waiting for the web server; a manually started Vite server on `127.0.0.1:4173` resolved the harness startup issue, and the full visual suite passed on the final post-edit run.
