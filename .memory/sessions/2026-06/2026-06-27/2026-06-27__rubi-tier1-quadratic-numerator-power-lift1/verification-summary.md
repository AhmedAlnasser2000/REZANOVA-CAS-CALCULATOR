# RUBI-TIER1-QUADRATIC-NUMERATOR-POWER-LIFT1 Verification Summary

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

- Verified `x+1` over `(2+x^2)^3` resolves through visible `partial-fractions` with `verified-exact` backcheck.
- Verified `2x+3` over `(x^2+2x+3)^4` resolves through visible `partial-fractions` with `verified-exact` backcheck.
- Preserved existing numerator power-2 cases, inverse-trig precedence for `1/(1+x^2)`, substitution ownership for pure derivative numerators such as `x/(1+x^2)^3`, and controlled unsupported behavior for repeated quadratic power `5`.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts -t "bounded rational partial-fraction primitives"` (focused rational band; 1 test passed, 14 skipped, duration 128.43s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts` (4 files passed, 49 tests passed, duration 132.83s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this backend milestone and required durable memory.
