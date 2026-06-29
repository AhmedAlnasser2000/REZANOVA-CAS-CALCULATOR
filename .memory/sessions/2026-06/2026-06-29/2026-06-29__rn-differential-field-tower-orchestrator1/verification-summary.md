# RN-DIFFERENTIAL-FIELD-TOWER-ORCHESTRATOR1 Verification Summary

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

- Passed: `npx vitest run src/lib/symbolic-engine/integration-risch-norman-orchestrator.test.ts src/lib/symbolic-engine/integration-risch-norman-hermite-reduction.test.ts src/lib/symbolic-engine/integration-risch-norman-log-derivative.test.ts src/lib/symbolic-engine/integration-risch-norman-exp-sincos-ansatz.test.ts`.
- Passed: `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`.
- Passed: `npx tsc -b --pretty false`.
- Passed: `node tools/validate-file-sizes.mjs`.
- Passed: `git diff --check`.

## Notes

- Added tests for the tower profile attempt plan so route-family ordering is visible without exposing public RN metadata.
