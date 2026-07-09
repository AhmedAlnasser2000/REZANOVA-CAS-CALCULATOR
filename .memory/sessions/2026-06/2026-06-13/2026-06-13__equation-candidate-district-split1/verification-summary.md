# EQUATION-CANDIDATE-DISTRICT-SPLIT1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

`EQUATION-CANDIDATE-DISTRICT-SPLIT1` is a structure-only private split of the Equation candidate validation/rejection surface.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/equation/candidate/*.test.ts src/lib/equation/domain-guards.test.ts`
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed the root candidate files remain public compatibility facades.
- Confirmed moved candidate tests exercise the root facades.
- Confirmed no file-size baseline change was required.

## Outcome

All planned candidate split checks passed.

## Outstanding Gaps

No known `EQUATION-CANDIDATE-DISTRICT-SPLIT1` gaps.
