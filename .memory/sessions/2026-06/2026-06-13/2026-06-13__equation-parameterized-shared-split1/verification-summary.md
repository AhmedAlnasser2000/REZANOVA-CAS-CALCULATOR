# EQUATION-PARAMETERIZED-SHARED-SPLIT1 Verification Summary

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

`EQUATION-PARAMETERIZED-SHARED-SPLIT1` is a structure-only split of selected-target Parameterized Equation helpers and private route internals.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/equation/parameterized/linear.test.ts src/lib/equation/parameterized/polynomial.test.ts src/lib/equation/parameterized/rational.test.ts src/lib/equation/parameterized/factorable-polynomial.test.ts src/lib/equation/parameterized/carrier.test.ts src/lib/equation/parameterized/composition.test.ts src/lib/equation/parameterized/exp-log.test.ts src/lib/equation/parameterized/trig.test.ts src/lib/equation/parameterized/mixed-algebraic.test.ts src/lib/equation/parameterized/readback.test.ts`
- `npm run test:unit -- src/lib/equation/equation-selected-target-isolation.test.ts src/lib/equation/equation-algebraic-isolation.test.ts`
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed public route files stayed in place.
- Confirmed trig route order remains direct trig first, mixed sine/cosine second.
- Confirmed exp/log route order remains target-base direct, same-base, then affine carrier isolation.
- Confirmed all new parameterized modules stayed under the 900-line ratchet.

## Outcome

All planned Parameterized split checks passed.

## Outstanding Gaps

No known `EQUATION-PARAMETERIZED-SHARED-SPLIT1` gaps.
