# RUBI-TIER1-QUADRATIC-COMPLETE-SQUARE1 Verification Summary

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

## Evidence

- Verified `1/(x^2+2x+3)^2` resolves through visible `partial-fractions` with `verified-exact` backcheck.
- Verified `1/(2x^2+4x+5)^3` resolves through visible `partial-fractions` with `verified-exact` backcheck.
- Preserved literal nonsquare quadratic reciprocal cases, existing linear partial-fraction routes, inverse-trig precedence for power `1`, and controlled unsupported behavior outside the bounded recurrence powers.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this backend milestone and required durable memory.
