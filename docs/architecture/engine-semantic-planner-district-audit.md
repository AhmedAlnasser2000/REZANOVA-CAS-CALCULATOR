# Engine Semantic Planner District Audit

Status: audit

Purpose: map `src/lib/engine/semantic-planner.ts` before any future district split. The semantic planner is an Engine active root that turns user-entered Latex into lightweight execution planning metadata for Calculate, Equation, and Trigonometry. It is not a solver, symbolic backend, Display readback layer, OOE policy layer, graphing runtime, or step-engine implementation.

## Current Public Surface

- `planMathExecution(latex, context)`: returns the canonical Latex, planner steps, execution path, suggested badges, and derivative strategy metadata used by mode orchestration.

## Responsibility Map

- Derivative and partial-prefix recognition: detects textbook derivative and partial derivative forms before mode execution.
- Balanced Latex segment parsing: collects command and grouped segments without changing user-facing syntax policy.
- Differential segment replacement: rewrites derivative bodies into canonical ComputeEngine-friendly forms.
- AST cleanup: compacts repeated products and reduces numeric operators used during planner canonicalization.
- Equation-side planning: splits top-level equalities and reduces each side without taking ownership of Equation solve routing.
- Planner output: attaches canonicalization steps and badges while keeping solver, display, and runtime semantics elsewhere.

## Current Consumers

- Calculate mode uses planner output for quickform execution badges and transformed expression routing.
- Equation mode uses planner output around symbolic route selection and algebra transforms.
- Trigonometry uses planner output for expression planning.
- Engine tests currently cover direct planner behavior; broader mode tests cover planner output through mode execution.

## Future Split Candidates

- `planner-types.ts`: public result and internal step/strategy contracts if future planner types grow.
- `latex-segments.ts`: command collection, balanced grouping, and derivative-body segment parsing.
- `derivative-routing.ts`: derivative and partial-prefix matching plus differential segment replacement.
- `canonicalization.ts`: repeated-factor compaction, numeric operator reduction, and equation-side canonicalization.
- `badges.ts`: planner badge construction and path labeling.
- Keep `semantic-planner.ts` as the public facade if a split happens.

## High-Risk Contracts

- Preserve canonical Latex output, planner step wording, badge labels, execution path names, derivative strategy metadata, and parse-error fallback behavior.
- Preserve raw adjacent-product behavior and do not change named-variable or reserved-symbol policy.
- Preserve Equation ownership of solve routing and answer modes.
- Preserve Symbolic Engine ownership of AST-level symbolic behavior.
- Preserve Calculate quickform behavior; do not use this surface to introduce verbose step rendering.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/engine/semantic-planner.test.ts`
- `npm run test:unit -- src/lib/modes/calculate/*.test.ts src/lib/modes/equation/*.test.ts src/lib/trigonometry/*.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move code or tests during this audit.
- Do not introduce a step engine, graphing runtime, generic planner framework, solver behavior, Display policy, OOE/runtime policy, schema, capability, replay/history, stored-value, or reserved-symbol change.
- Do not split `semantic-planner.ts` without a dedicated implementation milestone.
