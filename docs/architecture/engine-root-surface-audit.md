# Engine Root Surface Audit

Status: audit

Purpose: map the current `src/lib/engine/` surface before splitting the over-cap math execution bridge. Engine is the mode-facing execution and planning bridge for Calculate, Equation, Table, Trigonometry planning, guarded Equation, and result guarding. It is not the Symbolic Engine backend, an OOE traffic-control layer, a Display readback layer, a graphing runtime, or a step-engine framework.

## Current Surface

- `math-engine.ts`: over-cap expression action and table execution bridge. It owns public expression action descriptors, action request/runtime preparation, exact and numeric expression dispatch, symbolic backend handoff, result guard integration, and table building.
- `math-engine.test.ts`: over-cap root contract test covering descriptor visibility, solve/evaluate boundaries, factorization, numeric evaluation, trig angle units, symbolic simplify, integrals, and limits.
- `semantic-planner.ts`: active root planner for derivative/partial detection, balanced LaTeX segment parsing, equation-side canonicalization, repeated-factor compaction, numeric operator reduction, and planner badges.
- `math-analysis.ts`: small active root surface for Latex analysis and relational-operator detection used by Calculate and Equation mode routing.
- `result-guard.ts`: small active root surface for display-safety magnitude guards used by Engine, Calculus, Advanced Calc, and numeric helpers.

## Responsibility Map

- Engine owns mode-facing expression execution, action descriptor exposure, table output assembly, and semantic planning glue.
- Symbolic Engine owns AST-level symbolic route behavior, exact simplification, integration, limits, rational/radical normalization, and factoring primitives.
- Algebra owns reusable algebraic capability layers such as polynomial, rational-function, radical, domain/range, transform, and variable memory surfaces.
- Equation owns solve routing, answer modes, guarded stages, selected targets, domain intent, and replay/history contracts.
- OOE owns launch traffic control, stale/cancel/drop policy, runtime evidence, and host routing.
- Display owns branch-aware readback, large-result rendering policy, and final output structure.

## Consumers

- Calculate mode uses `runExpressionAction`, `analyzeLatex`, `isRelationalOperator`, and `planMathExecution`.
- Equation mode uses analysis and planner helpers for symbolic routing and algebra transforms, and uses `runExpressionAction` for guided polynomial paths.
- Table mode uses `buildTable` and cooperative table build types from `math-engine.ts`.
- Guarded Equation stages use `runExpressionAction` for expression-host fallback and validation handoff.
- Trigonometry uses `planMathExecution` for expression planning.
- Calculus, Advanced Calc, and numeric helpers use `result-guard.ts` constants and messages.

## Ratchet Pressure

- `src/lib/engine/math-engine.ts`: 1267 lines; main production split candidate.
- `src/lib/engine/math-engine.test.ts`: 1003 lines; should be split before production movement so the safety rails stay readable.
- `src/lib/engine/semantic-planner.ts`: 622 lines; mixed responsibility but below cap and safer to audit before any later split.
- `math-analysis.ts` and `result-guard.ts` are below cap and should stay active roots for now.

## Recommended Milestones

1. `ENGINE-MATH-ENGINE-TEST-SURFACE-TIDY1`: split the broad `math-engine.test.ts` into focused tests under `src/lib/engine/math-engine/` while keeping imports pointed at the root facade.
2. `ENGINE-MATH-ENGINE-DISTRICT-SPLIT1`: keep `math-engine.ts` as the public facade and move private execution/table internals into a district.
3. `ENGINE-SEMANTIC-PLANNER-DISTRICT-AUDIT0`: audit planner responsibilities before any later planner split.

## High-Risk Contracts

- Preserve descriptor ids, order, labels, and public capability ids.
- Preserve `runExpressionAction`, `listExpressionActionDescriptors`, `buildTable`, and cooperative table response contracts.
- Preserve exact Latex, approximate text, warnings, detail sections, supplements, result origins, guard messages, and table output shape.
- Preserve Calculate quickform behavior; do not turn this cleanup into a step-engine implementation.
- Preserve OOE/runtime policy, replay/history behavior, display/readback policy, schema contracts, stored-value behavior, and reserved-symbol policy.

## Test Gates

- `npx tsc -b --pretty false`
- Engine focused tests for math engine, analysis, planner, and result guard.
- Calculate, Equation, Table, Trigonometry, guarded Equation, Calculus, and Advanced Calc focused consumers after production movement.
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move code or tests during this audit.
- Do not introduce a graphing runtime, step engine, generic action framework, solver family, display policy, OOE policy, capability rename, or schema change.
- Do not remove root public imports.
- Do not split `semantic-planner.ts` without a dedicated planner audit.
