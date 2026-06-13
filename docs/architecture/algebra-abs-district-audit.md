# Algebra Abs District Audit

Status: audit

Purpose: document the current `abs-core.ts` surface before a later `ALGEBRA-ABS-DISTRICT-SPLIT1`. This audit is docs-only and does not move implementation.

## Current Public Surface

- Absolute-value node and condition builders.
- Absolute-value solve summary, detail-section, and unresolved-error readback.
- Absolute-value expression support and target collection.
- Perfect-square absolute-value carrier matching.
- Absolute-value equation family recognition from MathJSON and LaTeX.
- Exact absolute-value normalization for simplify reuse.
- Branch-aware numeric guidance for unresolved absolute-value families.

## Responsibility Map

- Scalar and node helpers: exact scalar arithmetic, signs, sums, differences, quotients, scaling, and simplified node construction.
- Placeholder mechanics: absolute-value placeholder replacement, linear placeholder parsing, polynomial placeholder root solving, and outer placeholder equation reduction.
- Family recognition: direct `|u|=v`, `|u|=|v|`, affine-wrapped families, outer-polynomial families, and outer non-periodic families.
- Branch generation: branch equations, branch constraints, stronger-carrier detection, and branch-family metadata.
- Readback and display support: solve summaries, detail sections, boundary guidance, unresolved errors, inline math summaries, and generated-branch sections.
- Exact normalization and numeric guidance: simplify-only abs normalization, finite branch sampling guidance, and interval-specific branch messaging.

## Dependencies And Consumers

- Depends on `radical-core.ts` for supported radical/rational-power and perfect-square radicand recognition.
- Depends on polynomial, branch, symbolic normalization, and display detail helpers.
- Consumed by `engine/math-engine.ts`, Equation guarded/shared solve paths, and Algebra abs-focused tests.
- Equation shared-solve tests also cover abs behavior through public Equation solve surfaces.

## Future Split Candidates

- `absolute-value/types.ts`: public/private family, placeholder, scalar, and support-kind types.
- `absolute-value/math-json.ts`: scalar arithmetic, simplified node construction, placeholder replacement, and target key helpers.
- `absolute-value/placeholder.ts`: placeholder carrier matching, polynomial root solving, and outer placeholder reductions.
- `absolute-value/families.ts`: direct, affine-wrapped, outer-polynomial, and outer non-periodic family recognition.
- `absolute-value/readback.ts`: summaries, detail sections, unresolved errors, and inline/generated branch readback.
- `absolute-value/normalize.ts`: exact absolute-value normalization.
- `absolute-value/numeric-guidance.ts`: branch-aware numeric guidance.
- Keep `abs-core.ts` as the root compatibility facade.

## High-Risk Contracts

- Preserve branch equations, branch constraints, and generated branch ordering.
- Preserve exact supplements, nonnegative conditions, and stronger-carrier stop behavior.
- Preserve output wording for summaries, detail sections, unresolved errors, and numeric guidance.
- Preserve bounded-family limits, placeholder depth limits, and current exact sink boundaries.
- Preserve public root imports for Algebra, Equation, and symbolic-engine consumers.

## Test Gates For A Later Split

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/abs-core.test.ts`
- `npm run test:unit -- src/lib/equation/shared-solve-tests/absolute-value.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- `npm run test:unit -- src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not split `abs-core.ts` in this audit.
- Do not change branch/readback wording, exact normalization, numeric guidance, solver behavior, display policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, or reserved-symbol policy.
- Do not fold Radical or Polynomial ownership into the Abs district; keep cross-core boundaries explicit.
