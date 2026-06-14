# Equation Guarded District Audit

Status: audit note

Purpose: map the current guarded Equation solve district before any structural split. This note is audit-only; it does not authorize solver-order changes, new Equation families, or OOE/runtime changes.

## Current Public Surface

- `runGuardedEquationSolve(request, depth?, trail?, options?)`: runs the default guarded Equation stage sequence.
- `runGuardedEquationSolveWithStageOrder(request, stageOrder, options?)`: runs a validated custom stage permutation and returns trace evidence for tests and parity checks.
- `runGuardedEquationSolveWithStageOrderAsync(request, stageOrder, options?)`: async guarded solve with cooperative yield/cancellation support and direct-symbolic host integration.
- `listGuardedEquationStageDescriptors()`: exposes the registered guarded stage descriptors.
- `runGuardedDirectSymbolicFallback(request)`: runs the prepared direct-symbolic fallback path.
- `EQUATION_SOLVE_CANCELLED_MESSAGE` and exported types for guarded stage ids, direct-symbolic host evidence, cancellation evidence, solve controls, options, and replay traces.

The root public facade remains `src/lib/equation/guarded-solve.ts`. Production Equation solving reaches this district through the existing Equation mode/runtime paths.

## Internal Responsibility Map

- Request preparation and metadata: radical/rational normalization, denominator and radical domain constraints, exact supplements, resolved-input metadata, and assumption detail merging.
- Stage registry and orchestration: default stage descriptors, exact-permutation stage-order validation, recursion trail state, execution-budget lookup, sync/async sequence runners, stage trace recording, and winning-stage detection.
- Cancellation and host evidence: before/after stage checkpoints, recursive-handoff checkpoints, helper checkpoints, cooperative yields, direct-symbolic cancellation evidence, and host execution evidence.
- Direct-symbolic fallback: skip rules for direct trig shapes, direct-symbolic worker runner handoff, `runExpressionAction` fallback, non-finite solution rejection, and candidate validation after transformed requests.
- Bounded polynomial route: direct bounded polynomial solve, polynomial-carrier follow-on, mixed-factor decomposition, branch recursion, transformed candidate validation, and exact/approx branch readback.
- Algebra transform route: absolute value, radical, rational-power, repeated-clearing, domain supplement, candidate-validation, detail-section, and route-budget behavior.
- Composition handoff: delegates to the composition district while preserving guarded depth, trail, execution budget, and recursive runner behavior.
- Trig routes: direct bounded trig solving, sum-product rewrite solving, square-split rewrite solving, backend error propagation, and solve-badge/readback assembly.
- Substitution route: substitution family matching, branch-set construction, recursive branch solving, transformed validation, diagnostics, async cooperative checkpoints, and merged branch results.
- Numeric interval route: interval-gated numeric solve, candidate-checked readback, numeric method propagation, and interval-specific error output.
- Outcome assembly: shared success/error factories, exact/approx solution extraction, duplicate removal, supplement merging, detail-section merging, periodic-family merging, candidate counts, badges, and unsupported-family fallback.
- State-keying: normalized zero-form state keys for recursion-cycle detection.

## Future Split Candidates

- `guarded/types.ts`: public stage ids, trace, cancellation, control, and direct-symbolic host types.
- `guarded/stage-registry.ts`: stage descriptors, default stage order, and custom-order validation.
- `guarded/orchestrator.ts`: sync/async stage sequencing, trace recording, recursion runners, cancellation checkpoints, and cooperative yields.
- `guarded/request-prep.ts`: algebra request preparation, domain/exact supplement merging, direct-symbolic validation, and metadata attachment.
- `guarded/direct-symbolic.ts`: direct-symbolic skip policy, worker-host handoff, host evidence, fallback execution, and non-finite solution rejection.
- `guarded/polynomial-stage.ts`: bounded polynomial solve, carrier follow-on, mixed-factor route, transformed candidate validation, and branch readback.
- `guarded/algebra/`: private algebra-transform modules for absolute value, radicals, rational powers, repeated clearing, route budgets, and route-specific detail text.
- `guarded/substitution/`: substitution branch generation, recursive result merging, validation helpers, diagnostics, and async checkpoint helpers.
- `guarded/outcome.ts`, `guarded/merge.ts`, and `guarded/state-key.ts`: can stay small, or be folded into outcome/state helper modules if a later split needs clearer ownership.

## High-Risk Contracts

- The default guarded stage order must remain `numeric-interval`, `bounded-polynomial`, `algebra-transform`, `composition`, `direct-trig`, `rewrite-trig`, `substitution`, then `direct-symbolic`.
- Custom stage orders must remain exact permutations of the registered stage ids.
- Numeric interval solving must remain gated by an explicit interval request.
- Transformed algebra, carrier, substitution, and direct-symbolic fallback paths must keep candidate validation and domain supplements attached to the original validation equation.
- Recursion-cycle detection must keep using normalized equivalent equation state, not raw Latex text alone.
- Cancellation trace phases, checkpoint messages, direct-symbolic host evidence, and cancelled solve wording must stay compatible with OOE/runtime callers.
- The direct-symbolic skip rule for direct trig shapes must continue to prevent misleading fallback results.
- `DisplayOutcome` metadata for result origin, planner/solve badges, branch readback, exact supplements, detail sections, periodic families, rejected candidates, and numeric methods must stay stable.
- The shared unsupported-family error must not become a silent fallback to unrelated real, complex, inequality, or parameterized routes.

## Test Gates

- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts`
- `npm run test:unit -- src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts`
- `npm run test:unit -- src/lib/equation/equation-direct-symbolic-worker.test.ts src/app/logic/runtimeControllers.test.ts`
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`

## Stop Rules

- Do not implement `EQUATION-GUARDED-DISTRICT-SPLIT1` in this audit.
- Do not edit `src/lib/equation/guarded/run.ts` or `src/lib/equation/guarded/algebra-stage.ts` for this milestone.
- Do not change guarded stage order, solver behavior, display/readback policy, OOE behavior, replay/history contracts, schemas, capabilities, worker-host behavior, or reserved-symbol policy.
- Do not add new Equation, Complex, Inequality, Parameterized, or Numeric families.
- Do not move cancellation policy, host selection, or display rendering policy into the guarded solver split.
