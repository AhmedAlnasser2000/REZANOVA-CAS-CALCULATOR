# CALCULUS-INTEGRAND-EQUATION-GUARD1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Status

Verified locally as a backend Calculus input guard milestone.

## Evidence

- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Passed: 3 files, 84 tests.
- `npx tsc -b --pretty false`
  - Passed.
- `node tools/validate-file-sizes.mjs`
  - Passed. File sizes are within caps.
- `npm run test:memory-protocol`
  - Passed. Memory protocol validation passed.
- `git diff --check`
  - Passed.
