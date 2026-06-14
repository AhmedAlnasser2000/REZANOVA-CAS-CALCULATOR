# Symbolic Shared Primitives Audit

Status: audit

Purpose: document the current `src/lib/symbolic-engine/` shared primitives before any split. These files are small compared with the Integration and Radical districts, but they have high blast radius across Symbolic Engine, Algebra, Equation, Trigonometry, Engine, and Display.

## Final Split Record

`SYMBOLIC-SHARED-PRIMITIVES-SPLIT1` split only `patterns.ts` behind the stable public root facade:

- `patterns/guards.ts` owns node and numeric guards.
- `patterns/latex.ts` owns ComputeEngine boxing, grouping, multiplication Latex, and numeric division Latex.
- `patterns/structure.ts` owns structural keys, dependency checks, Add/Multiply flattening, factor maps, repeated-product compaction, and additive/product rebuilding.
- `patterns/polynomial.ts` owns numeric constants, affine parsing, polynomial-term extraction, and the Algebra polynomial-core fallback.
- `normalize.ts` and `precedence.ts` stayed as active root surfaces.

The split was structure-only and did not change exact Latex, structural keys, flattening behavior, Add/Multiply sort order, precedence trace wording, polynomial fallback behavior, variable-dependency semantics, display policy, or solver behavior.

## Current Public Surface

- `patterns.ts`
  - Node guards and numeric guards: `isNodeArray`, `isFiniteNumber`.
  - Latex helpers: `boxLatex`, `wrapGroupedLatex`, `multiplyLatex`, `divideByNumericCoefficient`.
  - Structural keys and dependencies: `termKey`, `dependsOnVariable`.
  - Flattening and additive/product helpers: `flattenAdd`, `flattenMultiply`, repeated-product compaction, factor maps, term rebuilding, and additive assembly.
  - Polynomial/affine helpers: numeric constants, linear/affine parsing, polynomial-term extraction, and bounded exact polynomial fallback through Algebra polynomial core.
- `normalize.ts`
  - `normalizeAst`: deterministic Add/Multiply flattening, child normalization, stable sort, and numeric negation simplification.
  - `normalizeLatex` / `normalizeNode`: ComputeEngine parse/box wrapper plus precedence trace assembly.
- `precedence.ts`
  - `getPrecedenceClass`: public precedence classification.
  - `buildPrecedenceTrace`: traversal trace used by normalized expression metadata.

## Responsibility Map

- `patterns.ts` is the broad shared MathJSON toolkit. It mixes tiny type guards, Latex boxing, structural identity, dependency detection, flattening, factor compaction, affine parsing, and polynomial-term extraction.
- `normalize.ts` is the deterministic AST normalization root. It intentionally depends on `patterns.ts` flattening and `precedence.ts` tracing.
- `precedence.ts` is a small expression metadata helper. It depends only on `isNodeArray` and should remain boring unless the public precedence model changes.

## Current Consumers

- Symbolic Engine districts and routes: Integration, Radical, Rational, Power Log, Mixed Factor, Differentiation, Limits, Orchestrator, and tests.
- Algebra districts: absolute-value, radical, rational-function, polynomial-factor, transform-core, and domain-range.
- Equation districts: guarded algebra stages, composition, substitution, inequality relation parsing, polynomial carrier follow-on, range impossibility, and state-key generation.
- Trigonometry: normalization, identity matching, equation matching, and rewrite modules.
- Engine: semantic planner and normalized expression plumbing.
- Display: symbolic display rendering and repeated-product compaction.

## Split Readiness

- `patterns.ts` is the only meaningful split candidate in the next milestone. It is under the line cap, but it mixes enough unrelated helpers that a private folder can clarify ownership without changing behavior.
- `normalize.ts` should remain a root active surface for now. It is only 68 lines, and its behavior is more important than its shape.
- `precedence.ts` should remain a root active surface for now. It is only 46 lines and has one clear responsibility.

## Future Split Candidate

A future `SYMBOLIC-SHARED-PRIMITIVES-SPLIT1` should be narrow:

- Keep root `patterns.ts`, `normalize.ts`, and `precedence.ts` public imports stable.
- Create private modules under `src/lib/symbolic-engine/patterns/` only if the split stays mechanical:
  - `guards.ts` for `isNodeArray` and `isFiniteNumber`.
  - `latex.ts` for `boxLatex`, grouping, multiplication Latex, and numeric division Latex.
  - `structure.ts` for `termKey`, dependency detection, flattening, factor maps, repeated-product compaction, and additive/product rebuilding.
  - `polynomial.ts` for numeric constants, affine parsing, polynomial-term extraction, and Algebra polynomial-core fallback.
- Leave `normalize.ts` and `precedence.ts` in place unless the implementation needs only tiny import-path adjustments.

## High-Risk Contracts

- `termKey` must remain a JSON-stringify structural key. Many solvers use it for dedupe, equality, and route validation.
- `normalizeAst` must preserve current Add/Multiply flattening and sort order. Solver matching, state keys, and display readback depend on this determinism.
- `boxLatex` and grouping helpers must not change exact Latex, display readback, transform output, detail sections, or history/copy output.
- `flattenAdd` and `flattenMultiply` must preserve current recursive flattening semantics.
- `dependsOnVariable` must remain conservative and must not start treating constants, special symbols, or nested operator heads differently.
- Polynomial-term helpers must preserve exact Algebra polynomial-core fallback behavior and numeric tolerance/filtering.
- Precedence trace wording and order must remain stable for normalized expression metadata.

## Test Gates

- Direct primitive tests: `npm run test:unit -- src/lib/symbolic-engine/patterns.test.ts src/lib/symbolic-engine/normalize.test.ts src/lib/symbolic-engine/precedence.test.ts`
- Symbolic sweep: `npm run test:unit -- src/lib/symbolic-engine/*.test.ts`
- Trigonometry consumers: `npm run test:unit -- src/lib/trigonometry/*.test.ts`
- Equation consumers: `npm run test:unit -- src/lib/equation/guarded/*.test.ts src/lib/equation/shared-solve-tests/*.test.ts src/lib/modes/equation/*.test.ts`
- Algebra consumers: `npm run test:unit -- src/lib/algebra/absolute-value/*.test.ts src/lib/algebra/radical/*.test.ts src/lib/algebra/rational-function/*.test.ts src/lib/algebra/transform-core/*.test.ts src/lib/algebra/polynomial-factor/*.test.ts`
- Display/Engine consumers when Latex/term compaction is touched: `npm run test:unit -- src/lib/engine/*.test.ts src/lib/display/*.test.ts`
- Always include `npx tsc -b --pretty false`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check`.

## Stop Rules

- Do not change exact Latex, structural keys, flattening behavior, Add/Multiply sort order, precedence trace wording, polynomial-term fallback behavior, or variable-dependency semantics.
- Do not move Algebra polynomial capability logic into Symbolic Engine.
- Do not turn shared primitives into a generic symbolic framework or new solver layer.
- Do not split `normalize.ts` or `precedence.ts` in the same milestone unless the split is limited to import-path adjustments required by a `patterns.ts` facade.
- Do not alter OOE/runtime policy, replay/history contracts, schemas, capabilities, stored-value behavior, display policy, or reserved-symbol policy.
