# Algebra Radical District Audit

Status: audit

Purpose: document the current `radical-core.ts` surface before a later `ALGEBRA-RADICAL-DISTRICT-SPLIT1`. This audit is docs-only and does not move implementation.

## Current Public Surface

- Monomial, affine expression, supported radical, supported rational-power, and supported binomial types.
- Single-variable detection and expression variable checks.
- Domain-constraint merging and condition supplement rendering.
- Integer, monomial, binomial, and affine parsing helpers.
- Supported radicand, radical, and rational-power matching.
- Even-root condition detection and constraint construction.
- Square-root conjugate profile construction.
- Perfect-square radicand recognition.
- Radical node key generation.

## Responsibility Map

- Shared MathJSON helpers: simplification, expansion, variable collection, numeric constants, and exact scalar checks.
- Algebraic shape parsing: integer, positive rational, monomial, binomial, affine, and supported-radicand recognition.
- Radical matching: square/nth roots, rational powers, even-root domain conditions, and root-in-variable constraints.
- Conjugate handling: supported square-root terms, two-term and three-term conjugate families, squared conjugate products, residual cleanup eligibility, and condition constraints.
- Perfect-square radicands: exact scalar square roots, affine absolute-value collapse, and normalized perfect-square radicand profiles.
- Shared support helpers: condition supplement text, domain-constraint merging, and radical node identity keys.

## Dependencies And Consumers

- Depends on polynomial exact scalar helpers, bounded polynomial factoring, symbolic normalization, and MathJSON pattern helpers.
- Consumed by `abs-core.ts`, symbolic-engine radical normalization, symbolic-engine mixed-factor support, and Equation shared radical/carrier solve paths.
- Coverage is partly direct through symbolic-engine radical tests and partly indirect through Equation shared-solve radical/carrier tests.

## Coverage Gaps Before A Split

- Add or relocate focused direct tests for `matchSupportedRadical`, `matchSupportedRationalPower`, `buildSquareRootConjugateProfile`, `recognizePerfectSquareRadicand`, and even-root condition helpers.
- Keep symbolic-engine radical tests as integration coverage, not the only proof for private radical helpers.
- Preserve Equation shared radical/carrier tests as downstream behavior coverage.

## Future Split Candidates

- `radical/types.ts`: monomial, affine, supported radical, rational-power, binomial, conjugate, and perfect-square profile types.
- `radical/math-json.ts`: simplification, expansion, variable collection, exact scalar checks, node keying, and condition supplement helpers.
- `radical/parsing.ts`: integer, monomial, binomial, affine, and supported-radicand parsing.
- `radical/matching.ts`: supported radical/rational-power matching and even-root conditions.
- `radical/conjugates.ts`: square-root conjugate term matching and conjugate profile construction.
- `radical/perfect-square.ts`: perfect-square radicand and absolute-value affine collapse.
- Keep `radical-core.ts` as the root compatibility facade.

## High-Risk Contracts

- Preserve conservative bounded-family support and current unsupported-shape stops.
- Preserve even-root conditions, condition supplement Latex, and domain-constraint merging.
- Preserve conjugate family ids, residual cleanup eligibility, radical counts, and generated denominator products.
- Preserve perfect-square radicand readback and abs-backed normalization behavior.
- Preserve public root imports for Abs, symbolic-engine, Equation, and mixed-factor consumers.

## Test Gates For A Later Split

- `npx tsc -b --pretty false`
- Focused direct radical helper tests added for the split.
- `npm run test:unit -- src/lib/symbolic-engine/radical.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- `npm run test:unit -- src/lib/algebra/abs-core.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not split `radical-core.ts` in this audit.
- Do not change radical matching, rational-power handling, condition wording, conjugate behavior, perfect-square behavior, solver behavior, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, or reserved-symbol policy.
- Do not fold Abs ownership into the Radical district; `abs-core.ts` may consume Radical helpers but owns absolute-value family behavior.
