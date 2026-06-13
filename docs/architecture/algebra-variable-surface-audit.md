# Algebra Variable Surface Audit

Status: audit and split record

Purpose: document the current Algebra variable surface and the core district created by `ALGEBRA-VARIABLE-CORE-DISTRICT-SPLIT1`. Variable handling is a shared capability layer for symbol discovery, named-variable syntax, stored values, hints, and product-facing variable policy; it is not owned by one workspace.

## Current Public Surface

- `variable-core.ts`: MathJSON symbol discovery, reserved identifier filtering, identifier classification, variable role metadata, implicit adjacent-letter product detection, and display-safe product expansion.
- `variable-memory.ts`: stored-value validation, numeric/rational value parsing, structured substitution, protected substitutions, mode/action substitution policy, and readback/detail sections.
- `variable-memory-store.ts`: local stored-variable CRUD helpers used by app state.
- `variable-hints.ts`: user-facing hints for stored values, ignored stored values, solve targets, symbolic parameters, active/bound variables, reserved names, ambiguous adjacent letters, and unsupported names.
- `named-variable.ts`: explicit named-variable syntax for `@name`, `var(name)`, and `\mathrm{name}` plus reserved-name and editor/readback helpers.

## Responsibility Map

- Identifier policy: `variable-core.ts` and `named-variable.ts` own the distinction between single-letter symbols, indexed symbols, explicit named variables, reserved constants/units/functions, and unsupported raw names.
- Adjacent-letter policy: `variable-core.ts` detects raw adjacent-letter products and expands display/readback-safe products without turning LaTeX commands or explicit named-variable syntax into variables.
- Stored values: `variable-memory.ts` and `variable-memory-store.ts` own finite real stored values, simple exact rationals, substitution snapshots, protected names, ignored-policy lines, and persistence helpers.
- User hints: `variable-hints.ts` owns hint assembly for editor surfaces while preserving the current mode/screen policy around symbolic Equation and stored values.
- Capability metadata: `capability-readiness.ts` records `variable-core` as ready-with-adapter and keeps broader visible variable UI, named-string variables, and bivariate adoption as future work.

## Current Consumers

- App/UI: `AppMain.tsx`, `VariablesPanel.tsx`, and `VariableHintStrip.tsx`.
- Display and analysis: `display/result-readback.ts` and `engine/math-analysis.ts`.
- Modes: `modes/calculate.ts`, `modes/equation.ts`, `modes/table-core.ts`, and `advanced-calc/engine.ts`.
- Equation districts: target, isolation, composition, parameterized, complex polynomial, and polynomial system routes.
- Algebra: polynomial bivariate elimination and capability readiness.

## Ratchet Pressure

- `src/lib/algebra/variable-core.ts`: sizable active shared core.
- `src/lib/algebra/variable-memory.ts`: sizable active stored-value policy surface.
- `src/lib/algebra/variable-hints.ts`: moderate UI-facing policy surface.
- `src/lib/algebra/variable-memory-store.ts` and `src/lib/algebra/named-variable.ts`: smaller but policy-sensitive support surfaces.

No file-size baseline update was required for `ALGEBRA-VARIABLE-CORE-DISTRICT-SPLIT1`; the root facade and new private modules are all under the default cap.

## Variable Core District Shape

- `src/lib/algebra/variable-core.ts`: root compatibility facade for public variable analysis and implicit product imports.
- `src/lib/algebra/variable-core/types.ts`: public variable identifier, role, stop, fact, policy, and analysis types.
- `src/lib/algebra/variable-core/identifiers.ts`: reserved identifier sets, Greek names, literal-command set, node-array helper, sorting, and symbol classification.
- `src/lib/algebra/variable-core/math-json.ts`: MathJSON identifier and reserved identifier collection.
- `src/lib/algebra/variable-core/implicit-products.ts`: adjacent-letter scanning, balanced-group helpers, parenthesized product normalization, and display-safe expansion.
- `src/lib/algebra/variable-core/analysis.ts`: role assignment, stop construction, and `analyzeVariablesFromMathJson` / `analyzeVariablesFromLatex` orchestration.
- `src/lib/algebra/variable-core/index.ts`: private district export surface consumed by the root facade.

## Future Split Candidates

- `ALGEBRA-VARIABLE-MEMORY-DISTRICT-SPLIT1`: split stored value parsing, substitution, mode policy, and readback sections if stored-value behavior expands.
- `ALGEBRA-VARIABLE-HINTS-TIDY1`: tidy hint assembly only after preserving existing hint wording and mode/screen precedence.
- Keep `named-variable.ts` as the explicit syntax seam unless a later split needs shared reserved-name policy helpers.

## High-Risk Contracts

- Preserve `i` / `\imaginaryI` as reserved unit behavior and do not introduce override syntax here.
- Preserve `j` and `k` as ordinary variables where current callers treat them as ordinary.
- Preserve explicit named-variable syntax: `@name`, `var(name)`, and `\mathrm{name}`.
- Preserve raw adjacent-letter behavior: raw `mass` is not silently accepted as one named variable; explicit named syntax is required.
- Preserve stored-value constraints: finite real numbers and simple exact rationals only.
- Preserve protected substitution behavior for solve targets, active variables, bound variables, and mode/action policies.
- Preserve user-facing hint wording unless a dedicated UX milestone owns wording changes.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/variable-core.test.ts src/lib/algebra/variable-memory.test.ts src/lib/algebra/variable-hints.test.ts src/lib/algebra/named-variable.test.ts`
- `npm run test:unit -- src/lib/algebra/capability-readiness.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not split or move variable implementation during this audit.
- Do not change stored-value persistence, substitution semantics, hint wording, display expansion, Equation target policy, complex reserved-symbol policy, or named-variable syntax.
- Do not add variable override syntax, public assume features, broad multivariable policy, or workspace-specific ownership layers.
- Do not fold Equation target selection or Table variable ownership into Algebra variable internals.
