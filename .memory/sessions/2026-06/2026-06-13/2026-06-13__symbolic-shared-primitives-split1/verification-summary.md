# SYMBOLIC-SHARED-PRIMITIVES-SPLIT1 Verification Summary

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

`SYMBOLIC-SHARED-PRIMITIVES-SPLIT1` is a structure-only split of `patterns.ts` behind the stable public root facade.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/symbolic-engine/patterns.test.ts src/lib/symbolic-engine/normalize.test.ts src/lib/symbolic-engine/precedence.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/*.test.ts`
- `npm run test:unit -- src/lib/trigonometry/*.test.ts`
- `npm run test:unit -- src/lib/equation/guarded/*.test.ts src/lib/equation/shared-solve-tests/*.test.ts src/lib/modes/equation/*.test.ts`
- `npm run test:unit -- src/lib/algebra/absolute-value/*.test.ts src/lib/algebra/radical/*.test.ts src/lib/algebra/rational-function/*.test.ts src/lib/algebra/transform-core/*.test.ts src/lib/algebra/polynomial-factor/*.test.ts`
- `npm run test:unit -- src/lib/engine/*.test.ts src/lib/display/*.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed `patterns.ts` remains the public import boundary.
- Confirmed `normalize.ts` and `precedence.ts` stayed in place.
- Confirmed all new `patterns/` modules are below the default line cap.

## Outcome

All planned Shared Primitives split checks passed.

## Outstanding Gaps

No known `SYMBOLIC-SHARED-PRIMITIVES-SPLIT1` gaps.
