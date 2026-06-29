# RN-SYMBOLIC-QUADRATIC-RATIONAL-LINEAR-NUMERATOR1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Evidence

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts`.
- Passed: `npx vitest run src/lib/symbolic-engine/integration-symbolic-quadratic-rational.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`.
- Passed: `node tools/validate-file-sizes.mjs` after moving new symbolic-quadratic assertions into a focused test file.
- Passed: `npm run test:memory-protocol`.
- Passed: `git diff --check`.
- Blocked externally: `npx tsc -b --pretty false` currently fails in the active Equation lane at `src/lib/modes/equation/deterministic-numeric-algebraic.ts` for an unused import and `resultOrigin` fields on error outcomes. This milestone did not edit or stage Equation files.
