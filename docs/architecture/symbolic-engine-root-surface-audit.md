# Symbolic Engine Root Surface Audit

Status: audit

Purpose: map the current `src/lib/symbolic-engine/` surface before any district splits. Symbolic Engine is a shared math backend for Calculate, Calculus, Equation, Algebra, Trigonometry, Engine planning, and display helpers; it is not a workspace-owned truth layer.

## Current Surface

- `orchestrator.ts`: public engine runner surface for factoring, differentiation, integration, partial derivatives, normalization, and shared success/error envelopes.
- `normalize.ts`: lightweight normalization facade over ComputeEngine parse/normalize behavior.
- `patterns.ts`: shared MathJSON pattern helpers, flattening, affine parsing, term keys, Latex boxing, and polynomial-term helpers.
- `precedence.ts`: expression precedence helpers.
- `factoring.ts`: symbolic factoring route used by Algebra and Engine.
- `mixed-factor.ts`: mixed carrier factoring for radical/rational-power carrier shapes.
- `rational.ts`: exact rational normalization.
- `radical.ts`: exact radical normalization, square-root rationalization, conjugate transforms, condition supplements, and radical readback helpers.
- `power-log.ts`: exact power/log normalization and rewrite helpers.
- `differentiation.ts`: derivative helpers, equivalence checks, simplification, and metadata-backed differentiation.
- `integration.ts`: symbolic integration route selection, candidate metadata, rational/partial-fraction support, by-parts/substitution families, verification, and controlled failure output.
- `limits.ts`: finite/infinite limit rule matching and supported limit output.
- `partials.ts`: partial-derivative request parsing and resolution.

## Responsibility Map

- Symbolic Engine owns AST-level symbolic rewrites and route-local symbolic capability decisions.
- Algebra owns reusable algebraic capability layers such as polynomial, radical, rational-function, assumptions, domain/range, and transform primitives.
- Equation owns solve routing, answer modes, domain intent, selected targets, guarded stages, and replay/history contracts.
- Calculus owns workbench-facing calculus request/result policy and numeric fallback decisions.
- OOE owns launch traffic control, stale/cancel/drop policy, runtime evidence, and host routing.
- Display owns large-result rendering policy, branch-aware readback, and final output structure.

## Current Ratchet Pressure

- `integration.ts`: 1676 lines; primary over-cap split candidate.
- `radical.ts`: 1235 lines; second over-cap split candidate.
- `power-log.ts`: 883 lines; near-cap surface that should be audited before splitting.
- `rational.ts`: 835 lines; below cap but shared with Algebra rational-function and transform consumers.
- `limits.ts`: 796 lines; below cap but behavior-sensitive for Calculus.
- `patterns.ts` and `normalize.ts`: small line counts but high blast radius because they are imported by Algebra, Equation, Trigonometry, Engine, and Display.

## Public Import Consumers

- `src/lib/engine/`: orchestrator, partial derivatives, power/log, radical, rational, differentiation, patterns, and normalization.
- `src/lib/calculus/` and `src/lib/advanced-calc/`: differentiation, integration, limits, and partial derivatives.
- `src/lib/algebra/`: transform, radical, absolute-value, rational-function, polynomial-factor, domain/range, and symbolic-factor surfaces.
- `src/lib/equation/`: guarded stages, composition, substitution, inequality relation parsing, range impossibility, and polynomial carrier follow-on.
- `src/lib/modes/equation/`: exact power/log normalization in mode orchestration.
- `src/lib/trigonometry/`: identity recognition, normalization, equation matching, and rewrite modules.
- `src/lib/display/`: symbolic display pattern helpers.
- `docs/validation/symbolic-engine-runtime.md`: product validation runbook for symbolic runtime behavior.

## Recommended Next Milestones

1. `SYMBOLIC-INTEGRATION-DISTRICT-SPLIT1`
   - Keep `src/lib/symbolic-engine/integration.ts` as the public facade.
   - Split private modules for types/candidate metadata, rule dispatch, rational/partial-fraction routes, substitution and by-parts families, verification/readiness, and output assembly.
   - Preserve exact Latex, origin values, strategy ids, candidate metadata, verification status, controlled failure wording, and Calculus fallback behavior.

2. `SYMBOLIC-RADICAL-DISTRICT-SPLIT1`
   - Keep `src/lib/symbolic-engine/radical.ts` as the public facade.
   - Split private modules for types, scalar helpers, radical normalization, rationalization, conjugate transforms, supplements/constraints, and readback assembly.
   - Preserve Algebra radical-core contracts, condition supplements, exact Latex, rationalization metadata, and Equation radical/carrier downstream behavior.

3. `SYMBOLIC-POWER-LOG-SURFACE-AUDIT0`
   - Audit before splitting because `power-log.ts` is near the cap and feeds Algebra transforms, Equation mode orchestration, and Engine normalization.

4. `SYMBOLIC-SHARED-PRIMITIVES-AUDIT0`
   - Audit `patterns.ts`, `normalize.ts`, and `precedence.ts` before touching them. These files are small, but their consumer surface is broad enough that a casual tidy can become a behavior change.

## High-Risk Contracts

- Exact Latex output must remain stable for Calculate, Calculus, Equation, Algebra transforms, and display detail sections.
- Strategy ids, origin labels, capability-readiness evidence paths, candidate metadata, and controlled failure classes must not drift.
- Integration verification must continue using derivative backcheck and simplification trust policy without silently widening fallback behavior.
- Radical normalization must preserve domain constraints, condition supplements, conjugate profile behavior, and rationalization metadata.
- Shared pattern helpers must preserve MathJSON term keys, affine parsing, polynomial-term extraction, and variable-dependency checks.
- Symbolic Engine must not absorb Equation solve ownership, Algebra capability ownership, OOE traffic control, or Display render policy.

## Test Gates For Future Splits

- Root sweep: `npm run test:unit -- src/lib/symbolic-engine/*.test.ts`
- Integration split: `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/algebra/rational-function/rational-function-core.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts`
- Radical split: `npm run test:unit -- src/lib/symbolic-engine/radical.test.ts src/lib/algebra/radical/radical-core.test.ts src/lib/algebra/absolute-value/abs-core.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- Shared primitives: `npm run test:unit -- src/lib/symbolic-engine/*.test.ts src/lib/trigonometry/*.test.ts src/lib/equation/guarded/*.test.ts src/lib/modes/equation/*.test.ts`
- Always include `npx tsc -b --pretty false`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check`.

## Stop Rules

- Do not introduce new symbolic solver families during district splits.
- Do not change exact output wording, Latex formatting policy, source labels, strategy ids, candidate metadata, or failure wording.
- Do not move Algebra capability helpers into Symbolic Engine or Symbolic Engine routing into Algebra.
- Do not alter OOE host behavior, runtime fallback policy, replay/history contracts, schema, capability ids, stored-value behavior, or reserved-symbol policy.
- Do not split `patterns.ts`, `normalize.ts`, or `precedence.ts` without a dedicated shared-primitives audit.
