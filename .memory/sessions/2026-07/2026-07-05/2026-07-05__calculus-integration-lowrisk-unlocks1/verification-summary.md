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

- `npx vitest run src/lib/symbolic-engine/integration-lowrisk-unlocks.test.ts src/lib/symbolic-engine/integration-rational-partial-fractions.test.ts src/lib/symbolic-engine/integration-recognition-gates.test.ts` passed: 54 tests.
- `npx vite-node .task_tmp/calculus-integration-lowrisk-unlocks1/record-lowrisk-backend.ts` passed: 17 supported, 0 failed.
- `npx playwright test lowrisk-visual.spec.ts --config .task_tmp/calculus-integration-lowrisk-unlocks1/playwright.visual.config.ts` passed: 17 visual checks; screenshots under `.task_tmp/calculus-integration-lowrisk-unlocks1/visual-evidence/`.
- `node --test tools/validate-calculus-integration-corpus-ledger.test.mjs && node tools/validate-calculus-integration-corpus-ledger.mjs` passed: 550 unique cases, 17 duplicate records, 945 run results, 68 findings.
- `npm run test:file-sizes` passed after extracting rational LaTeX and positive-discriminant helpers.
- `npx tsc -b --pretty false` was attempted and is blocked by an unrelated pre-existing `src/AppMain.tsx(156,8)` unused `StatisticsScreen` diagnostic outside this calculus slice.

## Visual Evidence

- Playwright checked answer cards, family detail cards, trust/backcheck text, and readability for all 17 resolved low-risk rows.
- Visual run promoted to ledger run id `2026-07-05-calculus-integration-lowrisk-unlocks1-visual1`.
