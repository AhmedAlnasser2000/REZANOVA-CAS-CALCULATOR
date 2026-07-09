# CALCULUS-INTEGRATION-PRINTING-LAYER1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Passed

- `npx vitest run src/lib/symbolic-engine/integration-recognition-gates.test.ts src/lib/symbolic-engine/integration-lowrisk-unlocks.test.ts src/lib/symbolic-engine/integration-ibp-gaps.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/modes/calculate/standard.test.ts --reporter=dot` passed: 5 files, 90 tests.
- `npx vitest run src/lib/calculus/workspace/integrals.test.ts src/lib/modes/calculate/standard.test.ts --reporter=dot` passed after the final answer-row order correction: 2 files, 42 tests.
- `node --test tools/validate-calculus-integration-corpus-ledger.test.mjs` passed: 7 tests.
- `node tools/validate-calculus-integration-corpus-ledger.mjs` passed: 8 sources, 550 unique cases, 17 duplicate records, 973 run results, 68 scan findings.
- `npm run test:file-sizes` passed: 8 tests; 1536 files within caps.
- Playwright visual check passed after manual Vite startup: `npx playwright test .task_tmp/calculus-integration-printing-layer1/printing-layer-visual.spec.ts --config .task_tmp/calculus-integration-printing-layer1/playwright.visual.config.ts` passed 6 cases.

## Playwright Evidence

- `root-sum`: visually verified answer rows, `+C`, normal-form/detail cards, trust card, Copy Result, To Editor, and no readability overflow.
- `rational-polynomial-division`: visually verified split answer rows, grouped log/fraction coefficient, detail cards, trust card, Copy Result, To Editor, and no readability overflow.
- `difference-radical`: visually verified single-row answer preserves `\frac{x}{4\sqrt{4-x^{2}}}+C`, valid-when/detail cards, Copy Result, To Editor, and no readability overflow.
- `sum-radical`: visually verified single-row answer preserves `\frac{x}{4\sqrt{4+x^{2}}}+C`, detail cards, Copy Result, To Editor, and no readability overflow.
- `sinh-square`: visually verified single-row hyperbolic output, detail cards, Copy Result, To Editor, and no readability overflow.
- `cosh-affine-square`: visually verified grouped affine hyperbolic output, detail cards, Copy Result, To Editor, and no readability overflow.
- Evidence artifacts are under `.task_tmp/calculus-integration-printing-layer1/visual-evidence/` and `.task_tmp/calculus-integration-printing-layer1/printing-layer-visual-results.jsonl`.

## Blocked Or Failing

- `npx tsc -b --pretty false` failed because the current repo has an unrelated Guide contract-test loop over optional `article.relatedArticleIds`: `src/lib/guide/content.contract.test.ts(71,31): error TS18048: 'article.relatedArticleIds' is possibly 'undefined'`.
- A broader exploratory calculus suite also sees unrelated dirty Limits expectation drift; the focused integration and workspace gates above passed.

## Pending Commit Gates

- `npm run test:memory-protocol` after this session note is committed/staged.
- `git diff --check` after final memory updates.
