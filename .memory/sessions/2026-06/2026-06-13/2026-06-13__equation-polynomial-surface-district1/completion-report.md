# EQUATION-POLYNOMIAL-SURFACE-DISTRICT1 Completion Report

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

Create the Equation polynomial surface district with its audit record while preserving root public facades.

## What Changed

- Moved polynomial domain extraction, 2x2 polynomial system solving, and polynomial carrier follow-on solving into `src/lib/equation/polynomial/`.
- Kept `equation-polynomial-domain.ts`, `equation-polynomial-system.ts`, and `polynomial-carrier-follow-on.ts` as root compatibility facades.
- Added private polynomial modules for system types/outcome assembly and carrier result/root-dedupe helpers.
- Moved focused polynomial tests into the district while importing through root facades.
- Added `docs/architecture/equation-polynomial-surface-district.md` and refreshed the root surface map.

## Boundaries

- No solver behavior, output wording, display/readback, OOE/runtime policy, replay/history, schema, capability, worker-host, or reserved-symbol changes.
- No widening of polynomial system variables, stored-value policy, or carrier support.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/polynomial/*.test.ts` passed.
- `npm run test:unit -- src/lib/equation/equation-inequality.test.ts src/lib/equation/equation-complex.test.ts` passed.
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- No file-size baseline update was required.

## Commits

- Same-commit milestone: EQUATION-POLYNOMIAL-SURFACE-DISTRICT1.

## Follow-Ups

- Continue with `EQUATION-DIRECT-SYMBOLIC-WORKER-DISTRICT1`.
