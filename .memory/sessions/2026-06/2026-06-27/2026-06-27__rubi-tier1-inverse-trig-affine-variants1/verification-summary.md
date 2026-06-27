# RUBI-TIER1-INVERSE-TRIG-AFFINE-VARIANTS1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend

## Verification Evidence

- Focused tests cover exact inverse-trig routing for scalar arctan numerators, completed-square arctan denominators, affine shifted arcsin denominators, and rational square arcsin constants.
- Accepted cases keep visible `inverse-trig` and `verified-exact` backcheck.
- Arcsec-style reciprocal-root input remains a controlled unsupported case with root-domain hazards because branch/domain facts are deferred.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts` (1 file, 67 tests)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (4 files, 95 tests)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`
- Passed: `git diff --cached --check`.
