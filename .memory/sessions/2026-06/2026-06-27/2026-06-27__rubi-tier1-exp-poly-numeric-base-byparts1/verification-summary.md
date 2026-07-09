# RUBI-TIER1-EXP-POLY-NUMERIC-BASE-BYPARTS1 Verification Summary

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

- `x 2^x` and `x^2 2^x` resolve as visible `integration-by-parts` with `verified-exact` backcheck.
- `(x+1)^2(1/2)^(3x-1)` resolves through the expanded polynomial-factor feeder under visible `integration-by-parts`.
- `x 0^x`, `x (-2)^x`, and `x a^x` remain controlled unsupported.
- Focused symbolic integration tests passed with 61 tests in about `5.64s`.
- File-size ratchet initially caught `rules.ts` growth; numeric-base recurrence code was extracted to `numeric-base-exponential-parts.ts`, and the file-size gate then passed.
- Full backend integration/calculus/rational-function suite passed with 5 files and 97 tests in `5.51s`.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose` (61 tests passed, duration 5.64s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts` (5 files, 97 tests, duration 5.51s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction after the full gate passes.
- Staged diff should include only this numeric-base exponential by-parts milestone and its durable memory record.
