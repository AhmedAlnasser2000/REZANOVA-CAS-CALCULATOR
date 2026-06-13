# ALGEBRA-RATIONAL-FUNCTION-DISTRICT-SPLIT1 Verification Summary

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

`ALGEBRA-RATIONAL-FUNCTION-DISTRICT-SPLIT1` is a structure-only split of the Algebra Rational Function core.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/rational-function-core.test.ts src/lib/algebra/polynomial-domain-core.test.ts src/lib/algebra/assumption-adapters.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/algebra/assumptions-core.test.ts src/lib/algebra/capability-readiness.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/rational.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed root imports continue through `src/lib/algebra/rational-function-core.ts`.
- Confirmed the district doc records the split shape and high-risk contracts.
- Confirmed the source label `rational-function-core` remains unchanged.

## Outcome

All planned Rational Function district split checks passed.

## Outstanding Gaps

No known `ALGEBRA-RATIONAL-FUNCTION-DISTRICT-SPLIT1` gaps.
