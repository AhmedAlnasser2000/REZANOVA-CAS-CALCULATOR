# EQUATION-CANDIDATE-DISTRICT-SPLIT1 Completion Report

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

Split the Equation candidate validation and rejection surface into a private district while preserving root compatibility facades.

## What Changed

- Added `src/lib/equation/candidate/validation.ts` for numeric candidate dedupe and validation.
- Added `src/lib/equation/candidate/rejection.ts` for candidate rejection classification and message helpers.
- Kept `src/lib/equation/candidate-validation.ts` and `src/lib/equation/candidate-rejection.ts` as root compatibility facades.
- Moved candidate tests under `src/lib/equation/candidate/` and kept them importing through the root facades.

## Boundaries

- No candidate message wording changes.
- No assumption kind, source label, residual tolerance, domain-constraint, solver-order, display/readback, OOE, replay/history, schema, capability, worker-host, or reserved-symbol changes.
- No `domain-guards.ts` split in this milestone.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/candidate/*.test.ts src/lib/equation/domain-guards.test.ts` passed.
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- No file-size baseline update was required.

## Commits

- Same-commit milestone: EQUATION-CANDIDATE-DISTRICT-SPLIT1.

## Follow-Ups

- Continue with `EQUATION-TARGET-SURFACE-SPLIT1`.
