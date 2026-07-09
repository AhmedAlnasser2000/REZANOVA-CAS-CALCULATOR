# TRANSCENDENTAL-DEPTH2-GENERALIZATION1 Verification Summary

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
- backend

## Commands
- `npx vitest run src/lib/symbolic-engine/integration-transcendental-field-tower.test.ts src/lib/symbolic-engine/integration-transcendental-reduced-equation.test.ts src/lib/symbolic-engine/integration-transcendental-tower-normal-form.test.ts`
  - Passed: 3 files, 19 tests.
- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Passed: 3 files, 97 tests.
- `npx tsc -b --pretty false`
  - Passed.
- `node tools/validate-file-sizes.mjs`
  - Passed.
- `git diff --check`
  - Passed.

## Evidence
- `e^{\sin(x)}` now profiles as a depth-2 exp-over-trig candidate and stops at reduced-equation deferral.
- `\sin(\ln(x))` and `\ln(e^x)` now carry explicit depth-2 readiness labels.
- `\ln(\ln(\ln(x)))` remains a controlled depth-over-cap stop.
