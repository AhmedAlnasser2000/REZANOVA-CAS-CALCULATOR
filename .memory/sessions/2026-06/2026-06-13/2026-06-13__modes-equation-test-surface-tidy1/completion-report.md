# MODES-EQUATION-TEST-SURFACE-TIDY1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Split the oversized Equation mode root test into focused compatibility suites before production code movement.

## What Changed

- Moved `src/lib/modes/equation.test.ts` into focused suites under `src/lib/modes/equation/`.
- Added shared test support for Equation mode request fixtures and outcome text collection.
- Kept moved tests importing root public APIs from `../equation`.
- Updated the Modes Equation audit with the test-surface tidy record.
- Removed the stale root test file-size baseline entry.

## Boundaries

- Test/memory/docs/ratchet only.
- No production code, solver behavior, output wording, display/readback, OOE/runtime, replay/history, schema, capability, worker-host, stored-value, answer-mode, domain-intent, or reserved-symbol changes.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/modes/equation/*.test.ts` passed.
- `npm run test:unit -- src/lib/modes/equation-complex-stability.test.ts src/lib/modes/equation-worker-runtime.test.ts` passed.
- `node tools/validate-file-sizes.mjs --update-baseline` removed the stale root test baseline entry.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: MODES-EQUATION-TEST-SURFACE-TIDY1.

## Follow-Ups

- Proceed with `MODES-EQUATION-DISTRICT-SPLIT1` now that focused compatibility suites are in place.
