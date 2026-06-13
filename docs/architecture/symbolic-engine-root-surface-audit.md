# Symbolic Engine Root Surface Audit

Status: audit

Purpose: map the current `src/lib/symbolic-engine/` surface after the first district split wave. Symbolic Engine is a shared math backend for Calculate, Calculus, Equation, Algebra, Trigonometry, Engine planning, and display helpers; it is not a workspace-owned truth layer.

## Current Surface

- `orchestrator.ts`: public engine runner surface for factoring, differentiation, integration, partial derivatives, normalization, and shared success/error envelopes.
- `normalize.ts`: lightweight normalization facade over ComputeEngine parse/normalize behavior.
- `patterns.ts`: public facade for shared MathJSON pattern helpers, flattening, affine parsing, term keys, Latex boxing, and polynomial-term helpers.
- `precedence.ts`: expression precedence helpers.
- `factoring.ts`: symbolic factoring route used by Algebra and Engine.
- `mixed-factor.ts`: mixed carrier factoring for radical/rational-power carrier shapes.
- `rational.ts`: public facade for exact rational normalization.
- `radical.ts`: public facade for exact radical normalization, square-root rationalization, conjugate transforms, condition supplements, and radical readback helpers.
- `power-log.ts`: public facade for exact power/log normalization and rewrite helpers.
- `differentiation.ts`: derivative helpers, equivalence checks, simplification, and metadata-backed differentiation.
- `integration.ts`: public facade for symbolic integration route selection, candidate metadata, rational/partial-fraction support, by-parts/substitution families, verification, and controlled failure output.
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

- `limits.ts`: 796 lines; below cap but behavior-sensitive for Calculus.
- `mixed-factor.ts`: 572 lines; below cap but a coherent carrier-factor route used by factoring and guarded Equation.
- `differentiation.ts`: 470 lines; below cap and meaningful, but not currently urgent.
- `factoring.ts`: 398 lines; below cap and can wait until mixed-factor is settled.
- `normalize.ts` and `precedence.ts`: small active root surfaces with high blast radius because they are imported by Algebra, Equation, Trigonometry, Engine, and Display.

## Completed Districts

- `SYMBOLIC-INTEGRATION-DISTRICT-SPLIT1`: `integration.ts` facade plus private `integration/` district.
- `SYMBOLIC-RADICAL-DISTRICT-SPLIT1`: `radical.ts` facade plus private `radical/` district.
- `SYMBOLIC-SHARED-PRIMITIVES-SPLIT1`: `patterns.ts` facade plus private `patterns/` helper modules; `normalize.ts` and `precedence.ts` stayed active roots.
- `SYMBOLIC-POWER-LOG-DISTRICT-SPLIT1`: `power-log.ts` facade plus private `power-log/` district.
- `SYMBOLIC-RATIONAL-DISTRICT-SPLIT1`: `rational.ts` facade plus private `rational/` district.

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

1. `SYMBOLIC-LIMITS-DISTRICT-SPLIT1`
   - Keep `src/lib/symbolic-engine/limits.ts` as the public facade.
   - Split private modules for evaluation/types, known finite rules, local equivalents, rational local limits, signed poles, log-boundary limits, L'Hospital wiring, and public API assembly.
   - Preserve finite/infinite limit output, origins, detail-section wording, direction behavior, derivative-equivalent behavior, recursion budget, and Calculus/Advanced Calc consumers.

2. `SYMBOLIC-MIXED-FACTOR-DISTRICT-SPLIT1`
   - Keep `src/lib/symbolic-engine/mixed-factor.ts` as the public facade.
   - Split private modules for carrier detection/node mapping, scalar/polynomial helpers, low-degree carrier factor solving, family recognition, refinement/output, and public API assembly.
   - Preserve supported carrier families, unsupported-family `null` behavior, variable/multivariable rejection, exact factor nodes, and Equation guarded/factoring downstream behavior.

3. Later active-root cleanup candidates
   - `differentiation.ts`, `factoring.ts`, `orchestrator.ts`, `partials.ts`, `normalize.ts`, and `precedence.ts` should remain active roots until a later audit finds a stronger reason to split them.

## High-Risk Contracts

- Exact Latex output must remain stable for Calculate, Calculus, Equation, Algebra transforms, and display detail sections.
- Strategy ids, origin labels, capability-readiness evidence paths, candidate metadata, and controlled failure classes must not drift.
- Integration verification must continue using derivative backcheck and simplification trust policy without silently widening fallback behavior.
- Radical normalization must preserve domain constraints, condition supplements, conjugate profile behavior, and rationalization metadata.
- Rational normalization must preserve exclusion metadata, assumption facts, cancellation order, polynomial fallback behavior, and exact Latex.
- Limits must preserve finite/infinite output, origins, detail-section wording, direction behavior, and recursion budgets.
- Mixed-factor routing must preserve supported carrier families, unsupported `null` behavior, and exact factor nodes.
- Shared pattern helpers must preserve MathJSON term keys, affine parsing, polynomial-term extraction, and variable-dependency checks.
- Symbolic Engine must not absorb Equation solve ownership, Algebra capability ownership, OOE traffic control, or Display render policy.

## Test Gates For Future Splits

- Root sweep: `npm run test:unit -- src/lib/symbolic-engine/*.test.ts`
- Rational split: `npm run test:unit -- src/lib/symbolic-engine/rational.test.ts src/lib/algebra/rational-function/*.test.ts src/lib/algebra/transform-core/*.test.ts`
- Limits split: `npm run test:unit -- src/lib/symbolic-engine/limits.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/limits.test.ts src/lib/advanced-calc/engine.test.ts`
- Mixed-factor split: `npm run test:unit -- src/lib/symbolic-engine/mixed-factor.test.ts src/lib/symbolic-engine/factoring.test.ts src/lib/equation/shared-solve-tests/radicals-and-carriers.test.ts`
- Shared primitives: `npm run test:unit -- src/lib/symbolic-engine/*.test.ts src/lib/trigonometry/*.test.ts src/lib/equation/guarded/*.test.ts src/lib/modes/equation/*.test.ts`
- Always include `npx tsc -b --pretty false`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check`.

## Stop Rules

- Do not introduce new symbolic solver families during district splits.
- Do not change exact output wording, Latex formatting policy, source labels, strategy ids, candidate metadata, or failure wording.
- Do not move Algebra capability helpers into Symbolic Engine or Symbolic Engine routing into Algebra.
- Do not alter OOE host behavior, runtime fallback policy, replay/history contracts, schema, capability ids, stored-value behavior, or reserved-symbol policy.
- Do not split `patterns.ts`, `normalize.ts`, or `precedence.ts` without a dedicated shared-primitives audit.
