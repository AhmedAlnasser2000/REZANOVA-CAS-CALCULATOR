# Algebra Polynomial Core District Audit

Status: audit + split record

Purpose: document the current Algebra polynomial core before any future split. Polynomial Core is the shared exact representation and arithmetic substrate used by Algebra districts, symbolic-engine routes, Equation, Linear Algebra, and capability readiness; it is not a product-facing solver family by itself.

## Current Public Surface

- `polynomial-core.ts`: exact scalar contracts, scalar arithmetic, exact polynomial representation, polynomial normalization, node/Latex conversion, coefficient access, primitive/monic/content helpers, exact division, GCD, discriminant, and bounded MathJSON parsing.
- `polynomial-roots.ts`: numeric complex roots for degree 2 through 4, including quadratic direct solving and Durand-Kerner fallback.
- `polynomial-domain-core.ts`: polynomial/rational domain classification, denominator restrictions, domain assumption facts, and value-domain metadata.

## Responsibility Map

- Exact scalar arithmetic: `polynomial-core.ts` owns normalization, addition, subtraction, multiplication, division, number conversion, and scalar MathJSON node conversion.
- Exact polynomial representation: `polynomial-core.ts` owns terms-by-degree maps, normalization, coefficient arrays, degree/leading/constant queries, node/Latex rendering, and bounded polynomial parsing.
- Polynomial operations: `polynomial-core.ts` owns add/scale/multiply, exact division, monic normalization, primitive content, GCD, and quadratic discriminants.
- Numeric root fallback: `polynomial-roots.ts` owns degree-2 direct complex roots and bounded degree-3/4 Durand-Kerner behavior with stable errors.
- Domain classification: `polynomial-domain-core.ts` owns polynomial/rational domain metadata, denominator restrictions, assumption facts, and `polynomial-domain-core` source labels.

## Current Consumers

- Algebra rational-function, radical, absolute-value, polynomial-factor, and polynomial-elimination districts.
- Symbolic-engine factoring, mixed-factor, rational, radical, integration, and pattern helpers.
- Equation guarded, complex, inequality, composition, isolation, and polynomial-system routes.
- Linear Algebra exact matrix helpers and Equation mode numeric polynomial roots.
- Capability readiness descriptors and polynomial/domain tests.

## Future Split Candidates

- `ALGEBRA-POLYNOMIAL-CORE-DISTRICT-SPLIT1`: completed. `polynomial-core.ts` remains the root compatibility facade, while exact scalar and polynomial implementation ownership now lives under `src/lib/algebra/polynomial-core/`.
- Split private modules into scalar arithmetic, polynomial types, polynomial construction/normalization, arithmetic operations, division/GCD, discriminants, node/Latex conversion, and bounded parser.
- Keep `polynomial-roots.ts` separate unless numeric-root coverage or convergence policy expands.
- Keep `polynomial-domain-core.ts` separate unless a later `ALGEBRA-POLYNOMIAL-DOMAIN-TIDY1` preserves source labels and denominator wording exactly.

## Final Split Record

- `polynomial-core/types.ts`: exact scalar, exact polynomial, and exact polynomial division contracts.
- `polynomial-core/scalars.ts`: exact scalar normalization, arithmetic, equality, numeric conversion, GCD, and LCM helpers.
- `polynomial-core/math-json.ts`: MathJSON predicates, exact scalar node conversion, exact polynomial node conversion, and Latex rendering.
- `polynomial-core/arithmetic.ts`: exact polynomial construction, normalization, arithmetic, coefficient access, degree, and coefficient arrays.
- `polynomial-core/primitive.ts`: primitive integer form, content, and monic normalization.
- `polynomial-core/division.ts`: exact polynomial division and monic GCD.
- `polynomial-core/discriminant.ts`: quadratic discriminant helpers.
- `polynomial-core/parser.ts`: bounded exact polynomial parsing from MathJSON.
- `polynomial-core/index.ts`: private district export surface consumed by the root facade.

## High-Risk Contracts

- Preserve exact scalar normalization, zero-denominator behavior, rational node read/write behavior, and exact scalar numeric conversion.
- Preserve polynomial term normalization, degree caps, coefficient ordering, node/Latex rendering, primitive/monic/content semantics, and exact division/GCD behavior.
- Preserve parse rejection for decimal coefficients, multivariable inputs, degree overflow, negative/fractional powers, symbolic denominators, and non-polynomial forms.
- Preserve numeric-root degree limits, convergence errors, complex root normalization, sorting, and dedupe tolerance.
- Preserve `polynomial-core` and `polynomial-domain-core` capability/source labels and all downstream Equation/symbolic-engine contracts.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/polynomial-core.test.ts src/lib/algebra/polynomial-roots.test.ts src/lib/algebra/polynomial-domain-core.test.ts`
- `npm run test:unit -- src/lib/algebra/polynomial-factor-solve.test.ts src/lib/algebra/polynomial-elimination-core.test.ts src/lib/algebra/polynomial-bivariate-elimination.test.ts`
- `npm run test:unit -- src/lib/symbolic-engine/factoring.test.ts src/lib/symbolic-engine/mixed-factor.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Future work must keep the root facade stable unless a dedicated public-import migration milestone owns the change.
- Do not change scalar arithmetic, polynomial parsing, root solving, domain classification, source labels, solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, or reserved-symbol policy.
- Do not add Grobner support, broad multivariate algebra, graphing hooks, symbolic root objects, or new product-facing polynomial solver families.
