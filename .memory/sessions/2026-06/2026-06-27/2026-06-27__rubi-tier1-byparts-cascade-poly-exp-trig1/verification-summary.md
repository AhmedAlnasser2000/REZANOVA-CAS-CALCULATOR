# RUBI-TIER1-BYPARTS-CASCADE-POLY-EXP-TRIG1 Verification Summary

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

- Focused tests cover `x^5e^(2x+3)`, `x^4 sin(2x+1)`, `x^4 cos(3x-2)`, and `x^3 2^(2x+1)`.
- Successful cases keep visible `integration-by-parts` and exact or existing verified backcheck status.
- The milestone is behavior-hardening only; no runtime rule widening was required.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts` (61 tests)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (4 files, 89 tests)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`
- Passed: `git diff --cached --check`
