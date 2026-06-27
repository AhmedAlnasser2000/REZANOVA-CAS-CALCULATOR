# INTEGRATION-RATIONAL-PF-PERF-SPLIT-AUDIT0 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend

## Timing Evidence

- Focused integration file passed: `34` tests, duration `251.88s`.
- Full backend gate passed: `68` tests across `4` files, duration `253.69s`.
- Fast rational PF groups: linear `37-38ms`, repeated-linear `687-731ms`, mixed linear/quadratic `2.38-2.53s`.
- Exact-square repeated quadratics are fast: p2 `71-72ms`, scaled p2 `580-605ms`, p3 `211-232ms`, p4 `663-712ms`, scaled p3 `749-768ms`, scaled p4 `1.20-1.23s`.
- Hot cases: nonsquare p2 `20.37-20.63s`, nonsquare p3 `20.82-20.95s`, nonsquare affine p4 `27.02-27.23s`, completed-square p2 `45.19-45.52s`, scaled completed-square p3 `46.33-46.78s`.
- Numerator cases follow the same pattern: exact-square p2 cases are `70-579ms`, nonsquare p3 is `20.81-20.86s`, and completed-square p4 is `49.97-50.41s`.
- Existing calculus core exact backcheck test also reported about `22.09s`, reinforcing that the slow path is verification/equivalence work rather than classifier routing.

## Verification Commands

- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts --reporter verbose` (1 file passed, 34 tests passed, duration 251.88s)
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts --reporter verbose` (4 files passed, 68 tests passed, duration 253.69s)
- Passed: `npx tsc -b --pretty false`
- Passed: `node tools/validate-file-sizes.mjs`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Dedicated commit proceeding by user instruction; staged diff should include only this audit/test-structure milestone and required durable memory.
