# RN-ANSATZ-ORCHESTRATOR1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Status

Verified locally as a backend milestone with one external typecheck blocker from the active Equation lane.

- commit_hash: final hash reported in git/final handoff after commit

## Evidence

- `npx vitest run src/lib/symbolic-engine/integration-risch-norman-orchestrator.test.ts src/lib/symbolic-engine/integration-risch-norman-exp-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-sincos-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-exp-sincos-ansatz.test.ts src/lib/symbolic-engine/integration-risch-norman-log-correction.test.ts src/lib/symbolic-engine/integration-risch-norman-affine-rational-correction.test.ts`
  - Passed: 6 files, 29 tests.
- `npx vitest run src/lib/symbolic-engine/integration-risch-norman-orchestrator.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts`
  - Passed: 4 files, 90 tests.
- `node tools/validate-file-sizes.mjs`
  - Passed: 1134 files within caps.
- `git diff --check`
  - Passed.
- `npx tsc -b --pretty false`
  - Blocked by unrelated active Equation-lane dirty files: missing `EQUATION_PREPARE_NUMERIC_SOLVE_ACTION` / `prepareEquationNumericSolve` exports and stored-value action typing in Equation files. RN orchestrator type errors were fixed; the remaining errors are outside this milestone's touched files.
