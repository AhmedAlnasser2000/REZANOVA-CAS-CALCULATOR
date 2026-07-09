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

- `npx vitest run src/lib/symbolic-engine/integration-ibp-gaps.test.ts` passed: 15 tests.
- `npx vite-node .task_tmp/calculus-integration-ibp-gaps1/record-ibp-backend.ts` passed: 14 supported, 0 failed.
- `npx playwright test ibp-visual.spec.ts --config .task_tmp/calculus-integration-ibp-gaps1/playwright.visual.config.ts` passed: 14 visual checks; screenshots under `.task_tmp/calculus-integration-ibp-gaps1/visual-evidence/`.
- `node --test tools/validate-calculus-integration-corpus-ledger.test.mjs && node tools/validate-calculus-integration-corpus-ledger.mjs` passed: 550 unique cases, 17 duplicate records, 973 run results, 68 findings.

## Visual Evidence

- Playwright checked answer cards, `Integration By Parts` detail cards, visible facts where present, trust/backcheck text, and readability for all 14 resolved IBP rows.
- Visual run promoted to ledger run id `2026-07-05-calculus-integration-ibp-gaps1-visual1`.
