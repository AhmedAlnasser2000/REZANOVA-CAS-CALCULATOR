# RUBI-TIER1-TRIG-TAN-SEC-COT-CSC-POWER1 Verification Summary

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

## Verification Evidence

- Focused tests cover `tan^3(x)sec^2(x)`, `tan^4(2x+1)`, `sec^4(x)`, `cot^3(x)csc^2(x)`, `csc^6(2x+1)`, over-cap `tan^7(x)`, and non-affine product stops.
- Accepted direct-rule cases verify exactly; derivative-present overlap cases preserve `u-substitution` precedence.

## Verification Commands

- Passed: `npx vitest run src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/symbolic-engine/integration.test.ts` (2 files, 65 tests)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (4 files, 91 tests)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`
- Passed: `git diff --cached --check`.
