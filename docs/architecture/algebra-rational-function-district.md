# Algebra Rational Function District

Status: split

Purpose: document the Rational Function district created by `ALGEBRA-RATIONAL-FUNCTION-DISTRICT-SPLIT1`. This milestone preserves `src/lib/algebra/rational-function-core.ts` as the root compatibility facade while moving implementation ownership into `src/lib/algebra/rational-function/`.

## Current Public Surface

- Exact rational-function normalization.
- Normalized rational-function node, Latex, denominator exclusion, and assumption-fact construction.
- Supported denominator factorization into rational linear factors and irreducible quadratics.
- Distinct-linear partial-fraction readiness.
- General bounded partial-fraction readiness for repeated linear and irreducible quadratic factors.

## Final District Shape

- `types.ts`: public result, stop-reason, factorization, and partial-fraction types.
- `arithmetic.ts`: MathJSON parsing, rational-function arithmetic, normalization, and root public normalization entrypoints.
- `factorization.ts`: rational-root discovery, denominator factorization, linear-factor helpers, and polynomial power helpers.
- `partial-fractions.ts`: distinct-linear and general partial-fraction readiness assembly.
- `index.ts`: private district export surface consumed by the root facade.

## High-Risk Contracts

- Preserve source label `rational-function-core` in assumption facts and readiness metadata.
- Preserve denominator exclusion constraints, normalized Latex, stop reasons, and exactness boundaries.
- Preserve distinct-linear and repeated-linear/irreducible-quadratic partial-fraction behavior.
- Preserve root public imports for Algebra, symbolic-engine, Calculus, and Equation consumers.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/rational-function-core.test.ts src/lib/algebra/polynomial-domain-core.test.ts src/lib/algebra/assumption-adapters.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/algebra/assumptions-core.test.ts src/lib/algebra/capability-readiness.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/rational.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not change rational normalization behavior, partial-fraction support, assumption wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, or reserved-symbol policy in this split.
- Do not fold polynomial-core ownership into this district; Rational Function may consume polynomial helpers but does not own them.
