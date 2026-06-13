# Algebra Variable Memory District Audit

Status: audit and split record

Purpose: document the current Algebra variable memory, stored-value substitution, hint, persistence, and named-variable syntax surface before any future split. This surface is shared across Calculate, Equation, Calculus, Table, app runtime controllers, workspaces, and history/replay paths.

## Current Public Surface

- `variable-memory.ts`: stored variable name/value validation, numeric/rational parsing, CRUD helpers, MathJSON substitution, substitution snapshots, mode/action policy, ignored-policy lines, and readback detail sections.
- `variable-memory-store.ts`: lighter persistence-facing stored-variable CRUD helpers.
- `variable-hints.ts`: editor hint assembly for stored values, ignored stored values, solve targets, symbolic parameters, active/bound variables, reserved identifiers, adjacent-letter ambiguity, and unsupported names.
- `named-variable.ts`: explicit named-variable syntax for `@name`, `var(name)`, and `\mathrm{name}`, reserved-name checks, editor Latex, and normalization tokens.

## Responsibility Map

- Stored-value validation: `variable-memory.ts` owns the current product contract of one-letter stored variables plus explicit named variables, finite real values, and simple exact rational Latex/slash values.
- Substitution snapshots: `variable-memory.ts` owns replacement MathJSON, protected substitution snapshots, replayed snapshots, ignored stored-value lines, and readback detail sections.
- Mode/action policy: `variable-memory.ts` owns when stored values apply, stay symbolic, are ignored, or are unsupported for Calculate, Table, advanced-calc, and Equation actions.
- Persistence seam: `variable-memory-store.ts` owns simple local entry upsert/remove behavior and should remain persistence-facing.
- Hint seam: `variable-hints.ts` owns user-facing hint wording and mode/screen precedence.
- Named-variable seam: `named-variable.ts` owns explicit multi-character syntax and reserved identifier policy shared by variable-core, Equation target selection, polynomial systems, and stored values.

## Current Consumers

- App state schemas/Tauri state, runtime controllers, Calculate/Calculus/Table/Linear shell runtimes, and workspace variable panels.
- Calculate, Equation, Table, and advanced-calc mode engines.
- Equation target, isolation, parameterized, complex, composition, and polynomial system routes.
- Algebra polynomial elimination stored constants and variable-core identifier analysis.
- Variable-memory, variable-hints, named-variable, Calculate, Equation, Table, advanced-calc, runtime-controller, and OOE table tests.

## Future Split Candidates

- `ALGEBRA-VARIABLE-MEMORY-DISTRICT-SPLIT1`: completed. `src/lib/algebra/variable-memory.ts` remains the root compatibility facade, while implementation ownership now lives under `src/lib/algebra/variable-memory/`.
- Consider a later `ALGEBRA-VARIABLE-HINTS-TIDY1` only if hint wording or mode precedence grows; do not bundle with stored-value substitution.
- Keep `named-variable.ts` as the explicit syntax seam unless a future named-variable district needs shared reserved-name helpers.

## Final Split Record

- `variable-memory/types.ts`: public substitution/readback/mode-policy contracts plus private validation result contracts.
- `variable-memory/validation.ts`: stored-variable name validation, finite numeric/simple rational value parsing, build/upsert/remove helpers.
- `variable-memory/substitution.ts`: ComputeEngine parsing, named-variable normalization, MathJSON substitution, protected-substitution collection, and Latex snapshot matching.
- `variable-memory/snapshots.ts`: snapshot creation, dedupe, name intersection, and name-filtered snapshot helpers.
- `variable-memory/policy.ts`: mode/action stored-value policy and ignored stored-value policy lines.
- `variable-memory/readback.ts`: stored-value and variable-policy detail sections.
- `variable-memory/index.ts`: private district export surface consumed by the root facade.

## High-Risk Contracts

- Preserve finite-real/simple-rational stored value constraints and exact `\frac{n}{d}` normalization.
- Preserve protected substitution behavior for solve targets, active variables, bound variables, retained/eliminated polynomial variables, and mode/action policies.
- Preserve history/replay snapshot behavior and readback lines such as stored values used, replayed snapshot, effective expression, kept symbolic, and ignored stored values.
- Preserve explicit named-variable syntax and reserved identifier policy; `i` / `\imaginaryI` remains reserved and `j` / `k` stay ordinary where callers currently treat them as ordinary.
- Preserve hint wording unless a dedicated UX milestone owns copy changes.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/variable-memory.test.ts src/lib/algebra/variable-hints.test.ts src/lib/algebra/named-variable.test.ts src/lib/algebra/variable-core.test.ts`
- `npm run test:unit -- src/lib/modes/calculate.test.ts src/lib/modes/equation.test.ts src/lib/modes/table.test.ts src/lib/advanced-calc/engine.test.ts src/app/logic/runtimeControllers.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Future work must keep the root facade stable unless a dedicated public-import migration milestone owns the change.
- Do not change stored-value parsing, substitution semantics, protected names, hint wording, persistence shape, named-variable syntax, reserved-symbol policy, solver behavior, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, or capabilities.
- Do not add variable override syntax, broad symbolic assumptions, or workspace-owned variable memory.
