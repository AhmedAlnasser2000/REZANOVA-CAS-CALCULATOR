# EQUATION-POLYNOMIAL-SURFACE-DISTRICT1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Scope

`EQUATION-POLYNOMIAL-SURFACE-DISTRICT1` is a behavior-preserving split and audit record for the Equation polynomial surface.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/equation/polynomial/*.test.ts`
- `npm run test:unit -- src/lib/equation/equation-inequality.test.ts src/lib/equation/equation-complex.test.ts`
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed the three root polynomial files remain compatibility facades.
- Confirmed moved tests import through root facades.
- Confirmed the root surface map was updated to classify polynomial root files as facades.

## Outcome

All planned polynomial surface district checks passed.

## Outstanding Gaps

No known `EQUATION-POLYNOMIAL-SURFACE-DISTRICT1` gaps.
