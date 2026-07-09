# RUBI-TIER1-QUADRATIC-RECIPROCAL-NONSQUARE1 Verification Summary

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

- Verified `1/(2+x^2)^2`, `1/(3+x^2)^3`, and `1/(1/2+(2x+1)^2)^4` resolve through visible `partial-fractions` with `verified-exact` backcheck.
- Verified constant-radical derivative backcheck can prove the nonsquare arctan recurrence form exactly.
- Preserved existing overlap behavior for inverse-trig power `1`, derivative-numerator substitution cases, repeated linear partial fractions, and unsupported power `5+`.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts --reporter verbose`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this backend milestone and required durable memory.
