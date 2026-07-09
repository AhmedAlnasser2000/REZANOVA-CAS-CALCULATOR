# RUBI-TIER1-SECTION1-POLY-DEGREE-LIFT1 Verification Summary

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

- Verified higher-degree bounded polynomial expansion cases resolve through visible `direct-rule`.
- Verified exact original-integrand backcheck remains required for expanded-direct adoption.
- Verified `u-substitution` overlap precedence and unsupported over-limit/branch-sensitive stops remain intact.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Passed: `npx tsc -b --pretty false`
- Repo-wide gate blocked by unrelated dirty UI lane: `node tools/validate-file-sizes.mjs`
  - `src/AppMain.tsx` currently has 3392 lines against its 3357-line cap.
  - This milestone did not touch `src/AppMain.tsx`; the dedicated commit excludes that UI lane.
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff excludes the unrelated dirty UI/display lane that is keeping the repo-wide file-size gate red.
