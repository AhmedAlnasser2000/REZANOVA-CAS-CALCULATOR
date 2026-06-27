# RUBI-TIER1-CLOSEOUT-GATED1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Backend Gate Evidence

- `npx vitest run src/lib/symbolic-engine/integration.test.ts src/lib/symbolic-engine/integration-rational-partial-fractions.test.ts src/lib/calculus/engine/core.test.ts src/lib/calculus/workspace/integrals.test.ts src/lib/calculus/engine/antiderivative-rules.test.ts`
  - Status: passed.
  - Evidence: 5 test files passed, 103 tests passed.
- `npx tsc -b --pretty false`
  - Status: passed.
- `node tools/validate-file-sizes.mjs`
  - Status: passed.
  - Evidence: 1092 files checked, 9 baseline caps.
- `npm run test:source-mirrors`
  - Status: passed.
  - Evidence: source mirror registry validation passed 8 tests and registry validation.
- `git diff --check`
  - Status: passed.
- `npm run test:memory-protocol`
  - Status: pending until backend memory updates are written.

## Notes

- No Equation-lane files were edited or staged for backend gates.
- No public Calculus result schema, Display schema, History, OOE, Tauri, persistence, Rubi metadata, or source-mirror runtime dependency changed.
