# EQUATION-ANALYSIS-EVIDENCE-CONTRACT1 Verification Summary

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

- `npm run test:unit -- src/lib/modes/equation/analysis-evidence-contract.test.ts`
- `npm run test:unit -- src/lib/modes/equation/analysis-evidence-contract.test.ts src/lib/equation/numeric-interval/solve.test.ts src/lib/modes/equation/numeric-card-credibility-polish.test.ts src/lib/modes/equation/real-periodic-interval-numeric.test.ts`
- `npm run build`
- `npx eslint src/lib/equation/analysis-evidence.ts src/lib/modes/equation/run.ts src/lib/modes/equation/analysis-evidence-contract.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Known unrelated gate blocker:

- `npm run lint` currently fails in unrelated `src/app/shell/HistoryPage.tsx` (`react-hooks/set-state-in-effect`). Scoped lint for the changed files passes.

## Coverage Notes

- Numeric Interval route evidence includes target `x`, interval bounds, subdivisions, and local scope.
- Exact symbolic route evidence is attached for exact symbolic solves.
- Parameter-blocked interval outcomes still carry route evidence.
- Evidence is stored under an internal symbol and does not serialize through JSON.
