# App Runtime Boundary Audit

Status: `COMPARTMENTS-APP-RUNTIME-BOUNDARY-AUDIT0` docs-only boundary audit.

Purpose: document the current `src/app/runtime/` and `src/app/logic/` compartment before adding stricter Supercarrier validator rules. This audit does not move code, add enforcement, rewrite imports, change runtime behavior, or introduce a bus, registry, Surface Protocol, command authority, source rewrite, solver change, or display policy change.

## Scope

Owned paths:

- `src/app/runtime/`
- `src/app/logic/`

Adjacent but not owned:

- `src/AppMain.tsx`: app-shell orchestrator and JSX owner.
- `src/app/shell/`, `src/app/workspaces/`, `src/components/`, `src/styles/`: app-shell and visual component surfaces.
- `src/lib/ooe/`: runtime traffic control and lifecycle fact reporting.
- `src/lib/modes/`: mode execution facades and worker-facing mode requests.
- `src/lib/*` solver and shared capability layers.

## Responsibility Map

`src/app/runtime/` owns stateful app-runtime hooks and shell-facing runtime bundles:

- mode runtime hooks for Calculate, Equation, Calculus, Trigonometry, Statistics, Geometry, Matrix/Vector/Table, Guide, Labs, Launcher, Side Surfaces, Shell Focus, and History/Display;
- shared launch helpers such as `launchWorkspaceRuntimeJob`;
- memory persistence coordination through `useCalculatorMemoryPersistence`;
- history/display shell state through `useHistoryDisplayRuntime`.

`src/app/logic/` owns pure or mostly-pure orchestration helpers:

- primary/soft/keypad/window action routing;
- focus and expression routing;
- reset and editor runtime-control helpers;
- runtime controller assembly;
- app-flow helpers and mode guide routing.

The boundary is intentionally mode-facing and OOE-facing. It may coordinate state, requests, replay, focus, and launch policy, but it should not own solver algorithms, display formatting policy, component rendering trees, worker host definitions, or persisted schema migration logic beyond calling the app-state surfaces.

## Current Import Classes

### Intended App Shell / Runtime Seams

The app shell imports runtime hooks and logic helpers. Runtime hooks may import React hook primitives and `MathfieldElement` types because they are shell-facing state owners.

Allowed current examples:

- `react` hook primitives in runtime hooks.
- `mathlive` element types for editor refs.
- `../logic/*` helpers from runtime hooks.

Avoid broadening this seam into component ownership. Runtime hooks should not import `src/app/shell/**`, `src/app/workspaces/**`, `src/components/**`, or `src/styles/**`.

### OOE Launch / Control Seams

The app runtime may call OOE job-launch and pilot seams because it builds and controls workspace launches, pending tickets, and commit/stale decisions.

Allowed current examples:

- `src/lib/ooe/job-launch/job-contract`
- `src/lib/ooe/job-launch/launch-tickets`
- `src/lib/ooe/job-launch/active-job-registry`
- `src/lib/ooe/pilots/workspace-pilot`

The direct diagnostics-buffer use in `modeActionHandlers.ts` is a current app-runtime-to-OOE diagnostics seam used to summarize display outcomes for workspace pilot evidence. It is allowed but should be monitored; future validator work should keep it explicit rather than accidentally opening all OOE diagnostics imports.

### Mode Facade / Runtime Seams

The app runtime may depend on public mode facades and mode request/result types.

Allowed current examples:

- `src/lib/modes/calculate`
- `src/lib/modes/equation`
- `src/lib/modes/calculus`
- `src/lib/modes/table`
- `src/lib/modes/matrix`
- `src/lib/modes/vector`
- `src/lib/modes/core-mode`
- mode navigation facades such as `calculate-navigation`.

App runtime should not import worker entrypoints directly. Worker host identities remain OOE/Modes concerns.

### App-State / History / Variable-Memory Seams

The app runtime may call app-state persistence and consume history/settings snapshot contracts.

Allowed current examples:

- `src/lib/app-state/tauri`
- `src/types/calculator`
- app-runtime local `historyDisplayEntry`

Variable-memory integration is allowed through public app-state/algebra variable-memory surfaces where needed, but app runtime should not own storage policy or parse stored values itself.

### Allowed Public Solver / Navigation Facades

The app runtime currently consumes a small set of public solver-adjacent facades because it owns route state, live editor focus, replay restoration, and request construction:

- Equation: `equation-history`, `equation-navigation`, `equation-target-resolution`, `equation-ux`.
- Calculus: `calculus-identity`, `calculus-workbench`, `workspace/navigation`, `workspace/examples`.
- Trigonometry/Statistics/Geometry: navigation, examples, parser/runtime-input/serializer surfaces used by runtime hooks.
- Algebra: `algebra-transform`, `algebra-transform-ui`, `named-variable`, variable hints/memory surfaces where app-visible.
- Guide: content, examples, navigation, search-adjacent runtime state.
- Navigation/Input/Kernel/Editor/Virtual Keyboard: canonical input cleanup, menu/launcher types, keyboard capabilities/layouts, editor analysis hooks.

These are current public or workspace-facing seams, not blanket permission to import private solver districts.

## Risky Imports To Avoid Later

Future app-runtime code should avoid:

- `src/app/shell/**`, `src/app/workspaces/**`, `src/components/**`, and `src/styles/**` imports from `src/app/runtime/**` or `src/app/logic/**`;
- private solver district imports such as deep Equation guarded/composition/isolation modules, Algebra district internals, Symbolic Engine districts, Calculus engine internals, Engine math-engine internals, Display result/notation internals, or OOE runtime-control internals not already listed as an explicit launch/control seam;
- direct worker entrypoints or worker-client runtime config;
- Playground/source mirror paths or literals;
- raw schema migration or persisted-history parsing logic outside app-state/history surfaces.

## Future Validator Candidates

Good candidates after this audit:

- Add explicit tests that `src/app/runtime/**` and `src/app/logic/**` cannot import app shell component trees or styles.
- Add explicit tests that app-runtime and app-logic cannot import known private solver districts beyond the current allowlist of public facades/workspace-facing seams.
- Keep OOE job-launch, active-registry, launch-ticket, workspace-pilot, and the current diagnostics-buffer summary seam allowlisted by exact path rather than by whole OOE district.
- Allow public mode facades and request types, but reject worker entrypoint imports from app runtime/logic.
- Keep `src/lib/app-state/tauri` and calculator type imports allowed for persistence/memory coordination.

Candidates that should wait:

- Do not ban Trigonometry/Statistics/Geometry parser/serializer imports until each workspace has a dedicated public runtime-request facade or boundary audit.
- Do not ban Equation/Calculus navigation and route metadata imports; app runtime currently owns focus routing and replay restoration.
- Do not enforce variable-memory splits until the app-state/history/variables compartment has a separate audit and validator rule.

## `COMPARTMENTS-APP-RUNTIME-VALIDATOR1` Enforcement Record

`COMPARTMENTS-APP-RUNTIME-VALIDATOR1` promotes the high-confidence audit candidates into the read-only Supercarrier validator. The validator now checks production files under `src/app/runtime/**` and `src/app/logic/**` for app-runtime-specific boundary violations.

Enforced now:

- app runtime/logic cannot import app shell component trees, workspace components, React component surfaces, or styles;
- app runtime/logic cannot import mode worker entrypoints, worker clients, or worker runtime config;
- app runtime/logic cannot deep-import known private solver districts already tracked by the compartment validator;
- app runtime/logic can import only the audited OOE seams: job contract, launch tickets, active job registry, workspace pilot, and the transitional diagnostics summary seam.

Still intentionally allowed:

- public mode facades and request types;
- app-state/Tauri and calculator type seams;
- Equation and Calculus navigation/route metadata used for focus and replay;
- Guide, navigation, input, editor, virtual-keyboard, Algebra transform UI, named-variable, and variable-hint facades.

This enforcement is still import/text validation only. It does not rewrite files, move source, introduce a bus, change OOE behavior, or alter solver/runtime/display contracts.

## `APP-RUNTIME-OOE-SUMMARY-SEAM1` Cleanup Record

`APP-RUNTIME-OOE-SUMMARY-SEAM1` replaces the monitored app-runtime import from `src/lib/ooe/diagnostics/diagnostics-buffer` with a narrow OOE pilot/provenance summary seam. App runtime now imports the OOE-owned provenance summary helper from the pilots district when it needs compact output summaries for workspace provenance.

The summary shape and behavior remain owned by OOE diagnostics. The new helper delegates to the existing diagnostics summarizer, preserving output summary fields, unsafe marker detection, and diagnostics records. The validator allowlist is tightened so app runtime/logic can use the provenance summary seam but cannot import OOE diagnostics internals directly.

This is an import-boundary cleanup only. It does not change OOE lifecycle events, diagnostics retention, provenance payload shape, runtime routing, host selection, cancellation, stale-drop policy, commit legality, solver behavior, Display rendering, schemas, or Surface Protocol boundaries.

## High-Risk Contracts

- OOE remains the execution authority for launch, host selection, cancellation, stale drop, and commit legality.
- App runtime may build OOE requests and reserve/discard pending history tickets, but it must not emit independent lifecycle events or decide host routing.
- App runtime may restore mode-specific replay state, but app-state schemas own persisted compatibility and parsing.
- Display formatting and result rendering policy stay in Display/app-shell surfaces; app runtime passes outcomes and callbacks.
- Solver behavior, output wording, source labels, worker host ids, capability ids, history/replay contracts, and Guide routing remain outside this audit.

## Stop Rules

- Stop if an app-runtime boundary rule would require moving source code in this audit.
- Stop if enforcing a rule would break current mode runtime hooks before a replacement facade exists.
- Stop if the work needs OOE event types, Surface Protocol, a bus, runtime registry, plugin layer, command authority, source rewrites, schema changes, worker host changes, solver behavior changes, or Display policy changes.
- Stop if a proposed rule would classify current public workspace-facing facades as private without an owning audit.

## Verification

Docs-only gate:

- `npx tsc -b --pretty false`
- `npm run test:compartments-boundaries`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
