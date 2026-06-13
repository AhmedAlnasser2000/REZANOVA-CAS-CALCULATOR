# Algebra Transform Core District Audit

Status: audit

Purpose: document the current Algebra transform surface before any future split. Transform Core is a shared exact-rewrite capability for Calculate and Equation transform trays; it is not a solver stage replacement or display framework.

## Current Public Surface

- `transform-core.ts`: transform action union, result shape, action ordering, labels, eligibility checks, expression/equation parsing, expression transforms, equation-side transforms, LCD clearing, rationalization, conjugate application, and exact supplement merge.
- `algebra-transform.ts`: compatibility facade that aliases core functions to Calculate/Equation-facing names.
- `algebra-transform-ui.ts`: UI label seam for transform buttons.

## Responsibility Map

- Action registry: `transform-core.ts` owns the ordered transform descriptors for root/power rewrites, change-base, combine fractions, cancel factors, use LCD, rationalize, and conjugate.
- Expression transforms: `transform-core.ts` applies exact power/log, rational, radical, and conjugate normalizers to single expressions and returns transform badges/summaries.
- Equation transforms: `transform-core.ts` applies side-local transforms or zero-form LCD clearing while preserving exact supplement Latex.
- Eligibility: `transform-core.ts` parses and compares normalized Latex to avoid offering no-op transforms.
- Public seams: `algebra-transform.ts` preserves mode-facing imports; `algebra-transform-ui.ts` preserves button-label lookup.

## Current Consumers

- Calculate and Equation modes.
- Runtime controllers and Calculate runtime hook.
- DisplayPanel transform tray.
- Transform, Calculate, Equation, and runtime controller tests.
- Symbolic-engine power/log, rational, and radical normalization helpers.

## Future Split Candidates

- `ALGEBRA-TRANSFORM-CORE-DISTRICT-SPLIT1`: create `src/lib/algebra/transform-core/` while keeping root facades stable.
- Split private helpers into action/types, parsing/eligibility, expression transforms, equation transforms, descriptor registry, and result assembly.
- Keep `algebra-transform-ui.ts` as the UI seam unless labels move into a broader design token/copy system.

## High-Risk Contracts

- Preserve action ids, order, labels, transform badges, summary text, summary Latex, and `null` no-op behavior.
- Preserve expression/equation eligibility parity and normalized-Latex no-op suppression.
- Preserve exact supplement merge behavior and legacy supplement source handling.
- Preserve Calculate/Equation public imports and transform tray behavior.
- Preserve the boundary that Transform Core rewrites exact supported forms; it does not choose solve routes, run OOE, or validate replay/history.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/transform-core.test.ts src/lib/algebra/algebra-transform.test.ts`
- `npm run test:unit -- src/lib/modes/calculate.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move code or tests during this audit.
- Do not change action ids, labels, summaries, eligibility, exact Latex, supplements, transform tray behavior, solver behavior, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, or capabilities.
- Do not add a generic transform framework, new transform family, or workspace-owned transform layer.
