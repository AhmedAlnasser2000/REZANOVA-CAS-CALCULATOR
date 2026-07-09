# RUBI-TIER1-SECTION1-POLY-EXPAND1 Verification Summary

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

- Verified bounded products and positive-integer polynomial powers resolve through visible `direct-rule`.
- Verified target-free symbolic coefficient expansion resolves with exact antiderivative backcheck.
- Verified overlap precedence remains intact: derivative-factor binomial product `x(1+x^2)^3` remains `u-substitution`.
- Verified roots, negative powers, branch-sensitive carriers, and over-limit powers are not claimed by expanded-direct.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Not committed.
- `RUBI-TIER1-SECTION1-AUDIT0` dirty files preexisted this implementation; staging/commit must keep that boundary explicit.
