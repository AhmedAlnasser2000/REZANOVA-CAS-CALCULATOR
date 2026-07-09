# RUBI-TIER1-AFFINE-POWER1 Verification Summary

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

- Verified exact-rational affine powers and reciprocals including `(2*x+3)^5`, `(1/2*x+3)^5`, `1/(2*x+3)`, `1/(2*x+3)^3`, and `(2/3*x-1)^(-2)` resolve with `verified-exact` backcheck.
- Verified logarithmic affine reciprocal output by extending differentiation for `ln|u|` to produce `u'/u`.
- Verified overlap precedence remains intact: existing substitution, derivative-ratio, and partial-fractions routes may still claim matching affine forms before the direct fallback.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff excludes unrelated UI/display lane files.
