# Gate 5: CALCULUS-INTEGRATION-NEXT400-PROMOTION1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

- gate_type: backend
- gate_type: ui
- scope: Calculus integration only, indefinite only.
- boundary: no Equation imports, no shared Display schema redesign, no definite/improper integral widening.

## Implemented

- Regenerated the next400 candidate set from the hygienic generator, keeping grouped product forms and generator-only `1x`/`x^1` artifacts out of promoted rows.
- Reran the current-source bundled backend sweep with worker timeboxing rather than one `tsx` launch per case.
- Reran the full Playwright visual survey in resumable chunks, with a focused retry for one transient launcher/output flake at `0801`.
- Promoted 400 unique cases, 33 duplicate sightings, 400 combined backend-plus-Playwright run results, and 16 open scan findings into `benchmarks/calculus-corpus/integration/`.
- Updated the integration corpus validator expected committed-ledger totals.

## Results

- Regenerated backend: 400 total, 384 supported, 16 controlled unsupported, 0 timeout/performance-boundary rows.
- Regenerated Playwright visual survey: 400 rows checked, 384 success cards, 16 expected error cards, 0 runtime blockers after focused retry, 0 performance blockers, 0 readability issue rows, 0 mismatches.
- Remaining unsupported families:
  - 6 `ibp-polynomial-affine-inverse-trig` rows: polynomial factors times `arcsin(x/2)`.
  - 10 `ibp-polynomial-affine-trig-derivative` rows: `x^2 sec^2(ax)` and `x^2 csc^2(ax)` residual-log gaps.
- Duplicate sightings are preserved in `ledger/duplicate-cases.jsonl` and are not separate run targets.
- The original ambiguous scratch run remains scratch evidence only; promoted ledger truth comes from the regenerated candidate/backend/visual pass.

## Commands

- `node .task_tmp/calculus-integration-next400/generate-next400-candidates.mjs`
- `npx esbuild .task_tmp/calculus-integration-next400/backend-next400-timeboxed.ts --bundle --platform=node --format=esm --outfile=.task_tmp/calculus-integration-next400/backend-next400-timeboxed.bundle.mjs`
- `node .task_tmp/calculus-integration-next400/backend-next400-timeboxed.bundle.mjs`
- `npx playwright test -c .task_tmp/calculus-integration-next400/playwright.visual.config.ts .task_tmp/calculus-integration-next400/visual-next400-per-case.spec.ts`
- `node .task_tmp/calculus-integration-next400/summarize-next400.mjs`
- `npm run test:calculus-integration-corpus`
- `npm run test:memory-protocol`
- `git diff --check`

## Repo Gate Blockers

- `npm run test:file-sizes` is blocked by unrelated dirty Limits work: `src/lib/calculus/engine/limits.ts` has 1026 lines over its 900-line cap.
- `npx tsc -b --pretty false` is blocked by unrelated Equation work: `src/lib/equation/complex/locus-evidence.ts(152,46)` reads `.value` from an unsupported/undefined `LocusEvaluationResult` branch.
- These blockers were not staged into this Calculus integration promotion commit.

## Visual Evidence

- Aggregated visual JSONL: `.task_tmp/calculus-integration-next400/next400-visual-results-complete.jsonl`.
- Screenshots: `.task_tmp/calculus-integration-next400/visual-evidence/calc.int.indef.textbook.next400.0551.png` through `.task_tmp/calculus-integration-next400/visual-evidence/calc.int.indef.textbook.next400.0950.png`.
