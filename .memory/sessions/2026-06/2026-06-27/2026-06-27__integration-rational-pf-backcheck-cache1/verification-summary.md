# INTEGRATION-RATIONAL-PF-BACKCHECK-CACHE1 Verification Summary

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

## Timing Evidence

- Probe evidence before the final fix showed nonsquare p2 candidate parsing at `7ms`, AST differentiation at about `5570ms`, derivative-LaTeX rendering at about `5653ms`, and whole exact backcheck at about `16564ms`.
- After the fix, the same probe showed AST differentiation at about `2ms` and whole exact backcheck at about `5ms`; explicit derivative-LaTeX rendering remains about `4964ms` but is skipped for exact proofs.
- Filtered repeated-quadratic/numerator group passed in `1.13s` total, with former hot cases such as nonsquare p2/p3 at `3-12ms`, completed-square p2 at `7-9ms`, scaled completed-square p3 at about `40ms`, and completed-square numerator p4 around `209-244ms`.
- Full `src/lib/symbolic-engine/integration.test.ts` passed in `5.04s`, down from the audit run's `251.88s`.
- Full four-file backend gate passed in `5.06s`, down from the audit run's `253.69s`.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts -t "repeated quadratic|numerator-over-quadratic" --reporter verbose` (16 tests passed, 18 skipped, duration 1.13s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose` (34 tests passed, duration 5.04s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts --reporter verbose` (68 tests passed, duration 5.06s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this perf/backcheck milestone and required durable memory.
