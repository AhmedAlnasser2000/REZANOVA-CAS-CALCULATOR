# TRANSCENDENTAL-CERTIFICATE-ORCHESTRATOR1 Verification Summary

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
- backend

## Commands
- `npx vitest run src/lib/symbolic-engine/integration-transcendental-certificate-orchestrator.test.ts src/lib/symbolic-engine/integration-transcendental-liouville-solver.test.ts src/lib/calculus/engine/core.test.ts`
  - Passed: 3 files, 29 tests.
- `npx vitest run src/lib/symbolic-engine/integration-transcendental-certificate-orchestrator.test.ts src/lib/symbolic-engine/integration-transcendental-liouville-solver.test.ts src/lib/symbolic-engine/integration-transcendental-special-functions.test.ts`
  - Passed: 3 files, 23 tests.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Passed: 3 files, 97 tests.
- `npx tsc -b --pretty false`
  - Passed.
- `node tools/validate-file-sizes.mjs`
  - Passed.
- `npm run test:memory-protocol`
  - Passed.
- `git diff --check`
  - Passed.

## Evidence
- `e^{x^2}`, `\sin(x)/x`, `e^{e^x}`, and `\sin(x^2)` classify as named special-function certificate outcomes.
- `k(2ax+b)/(ax^2+bx+c)` stays elementary/route-owned instead of becoming a public certificate result.
- `e^{x^3}` and `e^{\sin(x)}` return controlled proof stops without Compute Engine proof evidence.
