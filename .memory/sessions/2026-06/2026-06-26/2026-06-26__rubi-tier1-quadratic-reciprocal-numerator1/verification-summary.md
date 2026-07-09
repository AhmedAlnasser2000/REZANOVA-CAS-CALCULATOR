# RUBI-TIER1-QUADRATIC-RECIPROCAL-NUMERATOR1 Verification Summary

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

- Verified `(x+1)/(1+x^2)^2`, `(2*x+3)/(4+x^2)^2`, and `3/(1+x^2)^2` resolve through visible `partial-fractions` with `verified-exact` backcheck.
- Verified `x/(1+x^2)^2` remains visible `u-substitution`.
- Confirmed dirty/untracked Formula Viewer Display-lane files were present and intentionally excluded from staging.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Blocked by unrelated dirty/untracked Display-lane files: `npx tsc -b --pretty false`
  - Errors were in `src/app/shell/formula-viewer/FormulaViewerVirtualizedContent.tsx` and `src/lib/display/scheduling/formula-viewer-virtualization.ts`, which were not touched or staged by this backend milestone.
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff excludes unrelated dirty UI/display lane files.
