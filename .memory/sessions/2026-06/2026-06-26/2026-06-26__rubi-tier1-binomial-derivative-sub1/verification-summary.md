# RUBI-TIER1-BINOMIAL-DERIVATIVE-SUB1 Verification Summary

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

- Verified exact-rational derivative-present binomial substitutions such as `x^5(1+x^6)^2`, `(7/2)*x^5*(3+(2/3)*x^6)^2`, `x^5/(1+x^6)^2`, and `x^5*(1+x^6)^(-1)` resolve through visible `u-substitution` with `verified-exact` backcheck.
- Verified branch-sensitive carriers remain blocked by `branch-analysis`.
- Verified missing derivative-present reciprocal cases remain controlled unsupported instead of being claimed by the new fallback.
- Confirmed untracked Display-lane Formula Viewer files were present and intentionally excluded from staging.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Blocked by unrelated untracked Display-lane files: `npx tsc -b --pretty false`
  - Errors were in `src/app/shell/formula-viewer/FormulaViewerVirtualizedContent.tsx` and `src/lib/display/scheduling/formula-viewer-virtualization.ts`, which were not touched or staged by this backend milestone.
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff excludes unrelated dirty UI/display lane files.
