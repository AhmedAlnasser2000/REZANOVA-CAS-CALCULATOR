# EQUATION-ISOLATION-DISTRICT-SPLIT1 Verification Summary

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

`EQUATION-ISOLATION-DISTRICT-SPLIT1` is a structure-only private split of the Equation algebraic and selected-target isolation implementation.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/equation/equation-algebraic-isolation.test.ts src/lib/equation/equation-selected-target-isolation.test.ts`
- `npm run test:unit -- src/lib/equation/equation-complex.test.ts src/lib/equation/parameterized/composition.test.ts`
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed the root public facades remained stable.
- Confirmed first-party callers did not need import rewrites.
- Confirmed the stale file-size baseline entry was removed and the new isolation modules stayed under the 900-line ratchet.

## Outcome

All planned isolation split checks passed.

## Outstanding Gaps

No known `EQUATION-ISOLATION-DISTRICT-SPLIT1` gaps.
