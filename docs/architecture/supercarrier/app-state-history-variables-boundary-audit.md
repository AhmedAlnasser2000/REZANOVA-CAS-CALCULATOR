# App-State, History, And Variables Boundary Audit

Status: `APP-STATE-HISTORY-VARIABLES-BOUNDARY-AUDIT0` docs-only boundary audit.

Purpose: document the shared app-state/history/variable-memory compartment before adding stricter Supercarrier validator rules. This audit maps persistence schemas, history shell state, calculator memory, stored-variable policy, variable hints, and named-variable syntax as one adjacent boundary with multiple owners.

This audit does not move source, add enforcement, rename fields, change HistoryEntry or calculator-memory schemas, alter stored-value parsing, change replay behavior, introduce a bus, introduce Surface Protocol, or change solver/runtime/display behavior.

## Scope

Owned or primary paths:

- `src/lib/app-state/`
- `src/types/calculator/`
- `src/app/runtime/useCalculatorMemoryPersistence.ts`
- `src/app/runtime/useHistoryDisplayRuntime.ts`
- `src/app/runtime/historyDisplayEntry.ts`
- `src/lib/algebra/variable-memory.ts`
- `src/lib/algebra/variable-memory/`
- `src/lib/algebra/variable-memory-store.ts`
- `src/lib/algebra/variable-hints.ts`
- `src/lib/algebra/named-variable.ts`

Adjacent consumers but not owners:

- `src/AppMain.tsx`: whole-app state assembly and shell orchestration.
- `src/app/runtime/useCalculateRuntime.ts`, `useEquationRuntime.ts`, `useCalculusRuntime.ts`, `useTableRuntime.ts`, and `useLinearAlgebraTableShellRuntime.ts`: mode runtime consumers of stored variables and replay substitutions.
- `src/app/logic/runtimeControllers.ts` and `modeActionHandlers.ts`: mode request assembly and OOE launch orchestration consumers.
- `src/components/VariablesPanel.tsx`: app-shell UI for editing stored variable entries.
- `src/components/VariableHintStrip.tsx`: app-shell UI for displaying variable hints.
- `src/app/shell/DisplayPanel.tsx` and private display-panel components: pass stored variables to editor hint surfaces.

Out of scope:

- Algebra variable-core identifier analysis.
- Equation target selection and solver districts.
- OOE lifecycle event emission.
- Tauri/Rust schema changes.
- UI redesign of variables/history/settings panels.

## Responsibility Map

### App-State Persistence

`src/lib/app-state/schemas.ts` owns runtime validation of settings, mode ids, history entries, calculator memory snapshots, launcher categories, mode trees, and stored variable values.

`src/lib/app-state/tauri.ts` owns:

- web-preview localStorage fallback;
- Tauri command invocation;
- schema parsing before accepting persisted data;
- history append/load/delete/clear helpers;
- variable-memory persistence;
- calculator-memory load/save/clear helpers;
- ODE numeric Tauri fallback.

App-state is the persisted compatibility boundary. Other compartments should call these APIs instead of parsing raw persisted state directly.

### History And Display Shell State

`useHistoryDisplayRuntime` owns in-memory history/display shell state:

- visible history list;
- pending history tickets;
- display outcome and Ans state;
- history launch order;
- commit/finalization behavior;
- replay display restoration and mode-specific replay delegation;
- memory fragment assembly for history/display/Ans.

`historyDisplayEntry.ts` owns canonical HistoryEntry construction from a committed DisplayOutcome and mode-specific context. It should remain an app-runtime helper, not an app-state schema parser.

`useCalculatorMemoryPersistence` owns autosave lifecycle, snapshot bounding, settled/interval save scheduling, and beforeunload/unmount flushes. It delegates actual persistence to app-state.

### Variable Memory And Named Variables

`src/lib/algebra/variable-memory.ts` is the public stored-variable compatibility facade. Its private district owns:

- stored variable name validation;
- finite real and simple rational value parsing;
- stored-value upsert/remove helpers;
- MathJSON substitution and protected-substitution snapshots;
- replay substitution snapshots;
- mode/action stored-value policy;
- ignored stored-value policy lines;
- readback/detail sections.

`variable-memory-store.ts` remains a lighter local CRUD/persistence helper, but the primary public stored-value policy surface is `variable-memory.ts`.

`variable-hints.ts` owns user-facing hint assembly for stored values, ignored stored values, solve targets, active/bound variables, reserved identifiers, unsupported names, and adjacent-letter ambiguity.

`named-variable.ts` owns explicit named-variable syntax and editor/readback helpers for `@name`, `var(name)`, and `\mathrm{name}`.

## Current Import Classes

Allowed current seams:

- app runtime may import app-state persistence helpers from `src/lib/app-state/tauri`;
- app runtime and app shell may use calculator types from `src/types/calculator`;
- app runtime may carry `StoredVariableValue` and `VariableSubstitutionSnapshot` through mode runtime hooks and controllers;
- app shell components may import `variable-hints` and `named-variable` for presentation and editor insertion behavior;
- shared Algebra/Equation/Mode layers may import `variable-memory.ts` as the public stored-value policy facade.

Seams to monitor:

- app runtime should not import private `src/lib/algebra/variable-memory/**` modules directly;
- app-state should remain the only persisted schema parser for history/settings/calculator memory;
- app shell should not mutate persisted history or calculator memory except through app-runtime/app-state callbacks;
- variable hints should not become the owner of stored-value parsing or substitution behavior.

## Future Validator Candidates

High-confidence future checks:

- app runtime/logic may import `src/lib/app-state/tauri`, `src/lib/app-state/schemas` only in tests or app-state-owned surfaces, and calculator public types;
- app runtime/logic may not import private `src/lib/algebra/variable-memory/**` modules directly;
- app runtime/logic may pass stored-variable state into public mode/runtime facades but should not call stored-value parser internals;
- app shell components may import `variable-hints` and `named-variable`, but not app-state persistence helpers directly;
- shared compute layers should not import app-state/Tauri persistence;
- OOE events should not include raw variable-memory snapshots or full persisted calculator-memory payloads.

Candidates that should wait:

- Do not ban `variable-memory.ts` root-facade imports by shared solver/mode code; it is currently the public stored-value policy surface.
- Do not split `variable-memory-store.ts` until a separate persistence-helper cleanup milestone owns it.
- Do not move `VariableHintStrip` or `VariablesPanel` in a boundary validator milestone.
- Do not add schema rejection or migration changes from the validator.

## High-Risk Contracts

- HistoryEntry schema and calculator-memory snapshot schema must stay stable unless an explicit schema migration milestone owns the change.
- Web-preview localStorage fallback must preserve the same parse/drop behavior.
- Stored-variable parsing remains finite real/simple rational only.
- Protected substitutions, replay snapshots, and ignored-policy lines must keep their current meaning and wording.
- Named-variable syntax remains explicit; raw adjacent words are not silently accepted as named variables.
- Reserved-symbol behavior remains unchanged.
- OOE remains the execution authority and should not consume full persisted snapshots as event payloads.

## Stop Rules

- Stop if a change would rename schema fields, alter replay/history compatibility, change calculator-memory persistence, or change Tauri command contracts.
- Stop if a validator rule would require moving app-state or variable-memory source in the audit commit.
- Stop if a proposed boundary requires app shell to parse raw persisted state.
- Stop if the work changes stored-value parsing, substitution semantics, hint wording, named-variable syntax, solver behavior, Display policy, OOE policy, event payload shape, or Surface Protocol boundaries.

## Verification

Docs-only gate:

- `npx tsc -b --pretty false`
- `npm run test:compartments-boundaries`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
