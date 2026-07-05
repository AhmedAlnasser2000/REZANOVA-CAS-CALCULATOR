# Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live
- commit_hash: pending at write time

## Gate 1: CALCULUS-INTEGRATION-NEXT400-HYGIENE-PERF1

- gate_type: backend
- gate_type: ui
- scope: Calculus integration only, indefinite only.
- boundary: no Equation imports, no shared Display schema change, no definite/improper integral widening.

## Evidence

- Regenerated scratch next400 candidates with grouped products such as `(4x-1)\sqrt{...}`, `(4x-1)e^{...}`, and `(4x-1)\sin(...)`.
- Generator-only artifacts `1x`, `-1x`, and `x^1` were normalized in scratch candidates before later promotion.
- Added `npm run test:calculus-integration-corpus` to run the integration ledger validator and its node test together.
- Added a route-owned 10s indefinite-integration performance budget before Compute Engine fallback.
- Added a visible `Integration Performance Boundary` error/detail card for exhausted budgets and known expensive affine trig-substitution radical families with no local exact route.
- Recorded that no partial antiderivative is adopted at the performance boundary.

## Commands

- `node .task_tmp/calculus-integration-next400/generate-next400-candidates.mjs`
- `npm run test:calculus-integration-corpus`
- `npx vitest run src/lib/calculus/engine/core.test.ts --testNamePattern "budget|fallback|Compute Engine|indefinite"`
- `npx playwright test -c .task_tmp/calculus-integration-next400-fix-batch1/playwright.visual.config.ts .task_tmp/calculus-integration-next400-fix-batch1/performance-boundary.visual.spec.ts`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Results

- Scratch generator wrote 400 next400 candidates with 0 `1x`/`-1x` and 0 `x^1` artifacts in the generated candidate file.
- Integration corpus validator passed: 8 sources, 550 unique cases, 17 duplicate records, 973 run results, and 68 scan findings.
- Focused Vitest passed: 11 relevant tests passed and 11 unrelated tests skipped by the name pattern.
- Playwright visual verification passed for the performance-boundary card, including rendered error, detail card, and no-partial-answer posture.
- Playwright screenshot evidence was written under `.task_tmp/calculus-integration-next400-fix-batch1/visual-evidence/performance-boundary-card.png`.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- `npx tsc -b --pretty false` was attempted and failed on unrelated Equation complex-locus work: `src/lib/equation/complex/locus-evidence.ts(152,46): error TS2339: Property 'value' does not exist on type 'LocusEvaluationResult'.`

## Staging Boundary

- Shared memory files `.memory/current-state.md`, `.memory/decisions.md`, and `.memory/journal/2026-07/2026-07-06.md` were already dirty from other lanes before this gate.
- To avoid staging unrelated work, this gate records durable evidence in this session dossier instead of staging those shared dirty memory files.
