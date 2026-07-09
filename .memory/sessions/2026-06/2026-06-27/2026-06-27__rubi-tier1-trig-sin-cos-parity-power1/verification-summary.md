# RUBI-TIER1-TRIG-SIN-COS-PARITY-POWER1 Verification Summary

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

- Focused tests cover `sin^5(x)`, `sin^6(2x+1)`, `cos^7(x)`, `cos^12(2x+3)`, and over-cap `sin^13(x)`.
- Accepted cases use visible `direct-rule` and `verified-exact` backcheck.
- Over-cap powers remain controlled unsupported.

## Verification Commands

- Passed: `npx vitest run src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/symbolic-engine/integration.test.ts` (2 files, 64 tests)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (4 files, 90 tests)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`
- Passed: `git diff --cached --check`
