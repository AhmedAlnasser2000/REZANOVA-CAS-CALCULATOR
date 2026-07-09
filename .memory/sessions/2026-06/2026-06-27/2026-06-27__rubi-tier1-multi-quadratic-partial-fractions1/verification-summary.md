# RUBI-TIER1-MULTI-QUADRATIC-PARTIAL-FRACTIONS1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate

- label: backend

## Evidence

- Verified rational-function factorization/readiness for two irreducible quadratic groups and repeated quadratic group multiplicity `2`.
- Verified `1/((x^2+1)(x^2+4))` and `1/((x^2+1)^2(x^2+4))` resolve through visible `partial-fractions` with `verified-exact` backcheck.
- Preserved `x/(1+x^2)^2` and `x/(1+x^2)^3` as `u-substitution` overlap cases.
- Preserved controlled unsupported behavior for three distinct irreducible quadratic groups.

## Verification Commands

- Passed: `npx vitest run src/lib/algebra/rational-function/rational-function-core.test.ts`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts -t "bounded rational partial-fraction primitives"` (focused rational band; 1 test passed, 14 skipped, duration 130.75s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` (4 files passed, 49 tests passed, duration 137.42s)
- Passed: `npx tsc -b --pretty false` before the final whitespace-only `rational.ts` line-count trim.
- Post-trim rerun blocked by unrelated dirty Display-lane files: `FormulaViewerVirtualizedContent.tsx` imports `FormulaViewerInspectableRow`, while the untracked `FormulaViewerReadability.tsx` currently exports `FormulaViewerCaseRow`; no Rubi/backend TypeScript errors were reported.
- Passed after trim: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this backend milestone and required durable memory.
