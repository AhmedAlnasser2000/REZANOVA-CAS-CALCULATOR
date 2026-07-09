# RUBI-TIER1-SECTION1-QUADRATIC-RECIPROCAL-POWER1 Verification Summary

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

- Verified `1/(1+x^2)^2` and `1/(4+x^2)^2` resolve through visible `partial-fractions` with `verified-exact` backcheck.
- Verified `1/(1+x^2)` remains `inverse-trig`, `x/(1+x^2)^2` remains `u-substitution`, and `1/(1+x^2)^3` remains unsupported.
- Verified exact rational-function equivalence in antiderivative backcheck supports the new family without relying on numeric-confidence adoption.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose`
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff excludes unrelated dirty UI/display lane files.
