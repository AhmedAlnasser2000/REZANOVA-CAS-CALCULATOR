# RUBI-TIER1-TRIG-AFFINE-BASIC1 Verification Summary

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

- Focused primitive probes resolved `tan(2x+3)`, `cot(2x+3)`, `sec(2x+3)^2`, `csc(2x+3)^2`, and `sec((1/2)x+1)^2` as successful `direct-rule` antiderivatives with `verified-exact` backcheck.
- The Compute Engine-only provenance test now uses `sec(x)`, preserving the intended separation after `tan(x)` became app-owned by this milestone.
- Full backend Rubi/calculus gate passed with 6 files and 85 tests in about `5.37s`.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts src/lib/symbolic-engine/differentiation.test.ts` (85 tests passed, duration 5.37s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this trig affine milestone and required durable memory.
