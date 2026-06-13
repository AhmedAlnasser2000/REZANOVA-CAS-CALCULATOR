# Symbolic Radical District

Status: shipped in `SYMBOLIC-RADICAL-DISTRICT-SPLIT1`

Purpose: record the structure-only split of Symbolic Engine radical normalization while preserving the public `src/lib/symbolic-engine/radical.ts` facade and all existing radical behavior.

## Final Shape

- `radical.ts` is the public compatibility facade.
- `radical/types.ts` owns radical normalization, conjugate transform, rationalization, and private normalization result contracts.
- `radical/scalars.ts` owns exact scalar arithmetic and exact scalar MathJSON reads.
- `radical/nodes.ts` owns MathJSON node builders, radical detection, monomial node construction, perfect-power extraction, quotient composition, and denominator sign normalization.
- `radical/denest.ts` owns constant nested square-root denesting. Recursive normalization is injected by the dispatcher to avoid a private-module cycle.
- `radical/monomials.ts` owns monomial root normalization and even-root condition collection.
- `radical/additive.ts` owns additive term decomposition and like-term combination.
- `radical/rationalize.ts` owns monomial denominator rationalization, square-root conjugate quotient rationalization, and conjugate-transform readiness.
- `radical/api.ts` owns public normalization and conjugate-transform entrypoints.

## Preserved Contracts

- Public exports remain the existing radical normalization, conjugate transform, and square-root rationalization types/functions.
- Equation-mode conservatism, multivariable rejection, condition supplements, rationalization metadata, normalized Latex, and Algebra/Equation downstream contracts are unchanged.
- `src/lib/symbolic-engine/radical.test.ts` remains rooted at the public facade because it is below the ratchet and still proves compatibility for callers.
- `patterns.ts`, `normalize.ts`, and `precedence.ts` were not touched.

## Test Surface Note

`src/lib/symbolic-engine/radical.test.ts` stays at the root. It imports the public facade, covers current radical product behavior, and remains small enough that moving it would add path churn without improving the safety rails.

## Verification Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/symbolic-engine/radical.test.ts src/lib/algebra/radical/radical-core.test.ts src/lib/algebra/absolute-value/abs-core.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/*.test.ts src/lib/modes/equation/*.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
