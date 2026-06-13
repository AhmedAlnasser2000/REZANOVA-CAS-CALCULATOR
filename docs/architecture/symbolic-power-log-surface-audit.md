# Symbolic Power Log Surface Audit

Status: audit

Purpose: document the current `src/lib/symbolic-engine/power-log.ts` surface before any future split. Power Log is a shared symbolic backend normalizer for exact power/root/log notation; it is not a product-facing solver family by itself.

## Current Public Surface

- `PowerLogNormalizationResult`: normalized MathJSON, normalized Latex, condition constraints, exact supplement Latex, and handled/changed flags.
- `normalizeExactPowerLogNode(node, mode)`: public normalizer used by Engine, Algebra transforms, and Modes Equation.
- Supported modes are currently private to the module but visible through the function signature:
  - `simplify`
  - `rewrite-root`
  - `rewrite-power`
  - `change-base`
  - `equation-preprocess`

## Responsibility Map

- Rational scalar helpers: integer gcd, rational reduction, rational MathJSON reads, and rational exponent node construction.
- Constraint helpers: positive and nonnegative condition merge plus exact supplement Latex rendering.
- Variable and numeric checks: variable detection, exponential-e recognition, positive-base validation, and numeric constant reads.
- Latex/readback helpers: power-base grouping, additive-term grouping, relation rendering, repeated-product compaction, and log/root serialization.
- Radical/power normalization: extraction of nested radical/rational-power information, familiar-root preservation, root-to-power rewrites, power-to-root rewrites, and even-root domain constraints.
- Log normalization: natural-log/common-log canonicalization, explicit positive-base validation, bounded same-base log sum combination, positivity constraints, and change-of-base conversion.
- Equation preprocessing: converts rational-power notation to solver-friendly roots and canonicalizes log notation before shared Equation solving.

## Current Consumers

- `src/lib/engine/math-engine.ts`: Simplify/Factor output normalization, exact supplement merging, numeric fallback recovery, and result guard paths.
- `src/lib/algebra/transform-core/expression-transforms.ts`: `Rewrite as Root`, `Rewrite as Power`, and `Change Base` expression transforms.
- `src/lib/algebra/transform-core/equation-transforms.ts`: matching equation transform variants.
- `src/lib/modes/equation/symbolic.ts`: equation-preprocess route before shared symbolic solving.
- `src/lib/symbolic-engine/power-log.test.ts`: direct compatibility coverage through the public normalizer.

## Future Split Candidates

- `types.ts`: public result contracts and private mode/serialized-node/log-call contracts.
- `scalars.ts`: rational helpers, numeric constant reads, positive-base validation, and exponential-e recognition.
- `constraints.ts`: condition merge and exact supplement readback.
- `serialization.ts`: Latex serialization, grouping helpers, relation Latex, and repeated-product compaction.
- `radicals.ts`: radical/rational-power extraction, familiar-root checks, root/power node builders, and domain constraints.
- `logs.ts`: log-call matching, log-node construction, same-base combination, and change-base conversion.
- `preprocess.ts`: Equation preprocessing.
- `api.ts`: `normalizeExactPowerLogNode` dispatch and public result assembly.

## High-Risk Contracts

- Exact Latex must stay stable for Engine, Algebra transform chips, Modes Equation preprocessing, and Display readback.
- Condition supplement wording must remain `\\text{Conditions: } ...` with current positive/nonnegative ordering and dedupe behavior.
- `handled` versus `changed` semantics must stay stable because Engine uses them to choose fallback and output paths.
- Plain familiar roots must remain unchanged under Simplify, while awkward nested root/power forms remain canonicalized.
- Unsupported log identities such as log differences and powers must continue to stay unchanged under Simplify.
- Change-base must keep explicit-base positive-real and not-equal-to-one restrictions.
- Equation preprocessing must remain bounded to notation normalization and must not become a new solve route.

## Test Gates

- Direct surface: `npm run test:unit -- src/lib/symbolic-engine/power-log.test.ts`
- Engine consumers: `npm run test:unit -- src/lib/engine/math-engine.test.ts src/lib/modes/calculate/*.test.ts`
- Algebra transform consumers: `npm run test:unit -- src/lib/algebra/transform-core/*.test.ts src/lib/algebra/algebra-transform.test.ts`
- Equation preprocessing consumers: `npm run test:unit -- src/lib/modes/equation/*.test.ts src/lib/equation/shared-solve-tests/transforms.test.ts`
- Symbolic sweep: `npm run test:unit -- src/lib/symbolic-engine/*.test.ts`
- Always include `npx tsc -b --pretty false`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check`.

## Stop Rules

- Do not introduce new power/log solver families, log quotient simplification, broad logarithm expansion, or approximate log solving in a split milestone.
- Do not change exact Latex, condition supplement wording, transform badges, transform summaries, source labels, result-origin policy, or fallback behavior.
- Do not alter OOE/runtime policy, replay/history contracts, schemas, capabilities, stored-value behavior, or reserved-symbol policy.
- Do not move shared `patterns.ts`, `normalize.ts`, or `precedence.ts` helpers as part of a Power Log split.
