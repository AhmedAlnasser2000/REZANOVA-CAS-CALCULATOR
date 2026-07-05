# CALCULUS-INTEGRATION-ONE-ANSWER-PRESENTATION1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Passed

- `npx vitest run src/lib/calculus/workspace/integrals.test.ts src/lib/modes/calculate/standard.test.ts --reporter=dot` passed: 2 files, 42 tests.
- `npx vitest run src/lib/symbolic-engine/integration-recognition-gates.test.ts src/lib/symbolic-engine/integration-lowrisk-unlocks.test.ts src/lib/symbolic-engine/integration-ibp-gaps.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/modes/calculate/standard.test.ts --reporter=dot` passed: 5 files, 90 tests.
- `node --test tools/validate-calculus-integration-corpus-ledger.test.mjs` passed: 7 tests.
- `node tools/validate-calculus-integration-corpus-ledger.mjs` passed: 8 sources, 550 unique cases, 17 duplicate records, 973 run results, 68 scan findings.
- `npm run test:file-sizes` passed: 8 tests; 1543 files within caps.
- `npx tsc -b --pretty false` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- Playwright visual check passed after manual Vite startup: `npx playwright test .task_tmp/calculus-integration-printing-layer1/printing-layer-visual.spec.ts --config .task_tmp/calculus-integration-printing-layer1/playwright.visual.config.ts` passed 6 cases.

## Playwright Evidence

- `root-sum`: visually verified one answer expression, `answer_raw_latex_count: 1`, copied/editor LaTeX preserved, no split-row detail text, no overflow issue.
- `rational-polynomial-division`: visually verified one answer expression, `answer_raw_latex_count: 1`, copied/editor LaTeX preserved, no split-row detail text, no overflow issue.
- `difference-radical`, `sum-radical`, `sinh-square`, and `cosh-affine-square`: visually verified one answer expression, copied/editor LaTeX preserved, facts/detail/trust cards visible, no overflow issue.
- Evidence artifacts are under `.task_tmp/calculus-integration-printing-layer1/visual-evidence/` and `.task_tmp/calculus-integration-printing-layer1/printing-layer-visual-results.jsonl`.

## Commit Gate Status

- Ready to commit once the staged diff is restricted to this Calculus integration presentation fix and its durable memory.
