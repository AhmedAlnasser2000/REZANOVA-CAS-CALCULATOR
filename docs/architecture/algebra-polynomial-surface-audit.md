# Algebra Polynomial Surface Audit

Status: audit

Purpose: document the current Algebra polynomial surface before any future implementation split. Algebra polynomial code remains a shared capability layer consumed by symbolic-engine and Equation; this audit does not authorize code movement or solver expansion.

## Current Public Surface

- `polynomial-core.ts`: exact polynomial representation, coefficient arithmetic, scalar parsing, bounded AST recognition, and bounded polynomial solving.
- `polynomial-roots.ts`: exact low-degree polynomial root helpers.
- `polynomial-domain-core.ts`: polynomial/rational domain classification, denominator exclusions, and assumption-fact construction.
- `polynomial-factor-solve.ts`: bounded factorization and solve routes for linear, quadratic, biquadratic, and small factorable families.
- `polynomial-elimination-core.ts`: exact Sylvester matrix and resultant support.
- `polynomial-bivariate-elimination.ts`: bounded bivariate resultant projection, candidate-pair validation, and solve assembly.

## Responsibility Map

- Representation and arithmetic: `polynomial-core.ts` owns normalized polynomial terms, degree checks, exact numeric coefficients, node conversion, and bounded AST solve dispatch.
- Root and factor solving: `polynomial-roots.ts` and `polynomial-factor-solve.ts` own supported exact roots, factor grouping, repeated roots, and route-specific stop behavior.
- Domain facts: `polynomial-domain-core.ts` owns polynomial/rational classification, denominator restriction extraction, and source-labeled assumption facts.
- Elimination: `polynomial-elimination-core.ts` owns exact resultant primitives; `polynomial-bivariate-elimination.ts` owns product-facing bivariate projection and candidate validation.
- Shared consumers: symbolic-engine uses these surfaces for factoring and mixed carriers; Equation uses them for guarded polynomial routing, complex polynomial routes, finite inequality sign charts, polynomial systems, and mode-level exact solving.

## Current Consumers

- `src/lib/symbolic-engine/factoring.ts`
- `src/lib/symbolic-engine/mixed-factor.ts`
- `src/lib/equation/guarded/polynomial-stage.ts`
- `src/lib/equation/guarded/algebra/radicals.ts`
- `src/lib/equation/inequality/finite.ts`
- `src/lib/equation/complex/polynomial.ts`
- `src/lib/equation/polynomial/`
- `src/lib/modes/equation.ts`

## Ratchet Pressure

- `src/lib/algebra/polynomial-factor-solve.ts`: near the default ratchet but still under cap.
- `src/lib/algebra/polynomial-bivariate-elimination.ts`: near the default ratchet but still under cap.
- `src/lib/algebra/polynomial-core.ts`: active shared core with moderate size.
- `src/lib/algebra/polynomial-domain-core.ts` and `src/lib/algebra/polynomial-elimination-core.ts`: lower immediate size pressure.

No file-size baseline update is expected for this audit-only milestone.

## Future Split Candidates

- `ALGEBRA-POLYNOMIAL-FACTOR-DISTRICT-SPLIT1`: split factor route types, rational-root search, biquadratic/quadratic-pair handling, solve assembly, and readback helpers if factor-solve work grows.
- `ALGEBRA-POLYNOMIAL-ELIMINATION-DISTRICT-SPLIT1`: split Sylvester/resultant primitives, projection helpers, candidate validation, and exact matrix propagation if elimination work grows.
- `ALGEBRA-POLYNOMIAL-DOMAIN-TIDY1`: tidy domain fact helpers only if source labels and denominator restriction wording can be preserved exactly.
- Keep `polynomial-core.ts` as an active root core unless a later audit designs a larger representation boundary.

## High-Risk Contracts

- Preserve exact coefficient normalization, scalar parsing, root ordering, root dedupe, and repeated-root behavior.
- Preserve source labels and assumption fact wording from domain helpers.
- Preserve bounded-family support limits; do not silently expand to broad square-free factoring, Grobner bases, algebraic-root factors, or general multivariate polynomial algebra.
- Preserve factorization strategy labels, output Latex, stop reasons, and downstream branch/readback expectations.
- Preserve resultant stop behavior and exact matrix failure propagation.
- Preserve bivariate stored-variable policy, candidate validation, and product-facing solve boundaries.
- Keep Equation polynomial district ownership separate; Algebra exposes shared capabilities but does not own Equation route orchestration.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/polynomial-core.test.ts src/lib/algebra/polynomial-roots.test.ts src/lib/algebra/polynomial-domain-core.test.ts src/lib/algebra/polynomial-factor-solve.test.ts src/lib/algebra/polynomial-elimination-core.test.ts src/lib/algebra/polynomial-bivariate-elimination.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/factoring.test.ts src/lib/symbolic-engine/mixed-factor.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not split, move, or rewrite polynomial implementation during this audit.
- Do not change solver order, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, or reserved-symbol policy.
- Do not add new polynomial solver families, Grobner support, graphing hooks, or product-facing system capabilities.
- Do not fold symbolic-engine or Equation route ownership into Algebra polynomial internals.
