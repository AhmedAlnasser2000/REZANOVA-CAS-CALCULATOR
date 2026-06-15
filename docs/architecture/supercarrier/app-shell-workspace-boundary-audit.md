# App Shell Workspace Boundary Audit

Status: `APP-SHELL-WORKSPACE-BOUNDARY-AUDIT0` docs-only boundary audit.

Purpose: document the current `AppMain`, app shell, workspace component, and shared React component import surface after the first workspace error-boundary layer. This audit prepares future Supercarrier validator work, but it does not move code, add enforcement, change imports, introduce a bus, add a runtime registry, expose Surface Protocol, or alter solver/runtime/Display behavior.

## Scope

Owned paths:

- `src/AppMain.tsx`
- `src/app/shell/`
- `src/app/workspaces/`
- `src/components/`

Adjacent but not owned:

- `src/app/runtime/` and `src/app/logic/`: app-runtime state, launch, routing, persistence, and action seams.
- `src/lib/ooe/`: OOE traffic control, diagnostics, lifecycle events, and job state.
- `src/lib/display/`: shared Display policy, notation, result, and scheduling helpers.
- `src/lib/*` math and workspace libraries: mode facades, solver districts, navigation metadata, and workspace-owned request helpers.
- `src/styles/`: CSS ownership; this audit does not move selectors.

## Responsibility Map

`AppMain` remains the cross-mode visual orchestrator. It owns top-level JSX composition, shell component wiring, workspace selection, runtime hook consumption, keyboard/keypad action dispatch, and the current workspace error-boundary island.

`src/app/shell/` owns shell components:

- display panel wrapper and private display-panel render components;
- keypad, launcher, menu inspector, mode strip, soft menu, side-surface host, and compartment workspace boundary wrapper;
- shell-only workspace-to-compartment identity resolution.

`src/app/workspaces/` owns the visible guided workspace components:

- Calculate, Equation, Calculus, Trigonometry, Statistics, Geometry, Guide, Table, Matrix, and Vector screens;
- component-level editor fields, draft inputs, preview cards, and mode-specific panel props;
- no solver algorithms and no OOE host decision logic.

`src/components/` owns reusable React components that are not a single workspace:

- Math editor/static rendering;
- history, settings, variables, labs, notation, diagnostics, and small input components;
- component tests and editor shortcut/keyflow helpers.

## Current Import Classes

### Intended Shell / Runtime Seams

`AppMain` imports runtime hooks and app logic helpers by design:

- `src/app/runtime/use*Runtime` hooks;
- `src/app/logic/*Router` and related action helpers;
- `src/app/shell/*` shell components;
- `src/app/workspaces/*` visible workspace components.

Future validators should continue to treat `AppMain` as the shell composition root, while ensuring it does not re-acquire persistence internals, solver internals, or OOE control internals that now belong behind narrower seams.

### Workspace Component Seams

Workspace components currently import reusable UI components, types, and public workspace-facing helpers:

- `MathEditor`, `MathStatic`, `SignedNumberInput`, `SignedNumberDraftInput`, `VariableHintStrip`, and `GeneratedPreviewCard`;
- `types/calculator` for visible state and result contracts;
- public navigation/workbench helpers such as Calculate menu metadata, Calculus workbench helpers, Trigonometry angle reference data, and Linear Algebra notation presets.

This is intentional. Workspaces are UI surfaces that render guided state and call callbacks supplied by app runtime. They should not import private solver districts or OOE runtime-control internals.

### Display / Diagnostics / Component Seams

DisplayPanel private components use Display facades and scheduling helpers:

- `result-detail-lines`;
- `display/scheduling/display-render-scheduler`;
- `symbolic-display`, `math-notation`, and notation context helpers through public Display facades.

`OoeDiagnosticsPanel` is the current developer-only diagnostics component. It imports OOE diagnostics/events types and the OOE compartment label option list directly. That is an intentional component-to-diagnostics seam for the developer panel, not a pattern for normal workspace components.

`CompartmentErrorBoundary` imports the shared compartment manifest type and UI-boundary record helper. This is the shell-to-Supercarrier error-boundary seam created by `COMPARTMENTS-ERROR-BOUNDARIES1`.

### Public Mode / Navigation / Metadata Seams

The app shell uses public metadata and display-safe helpers:

- navigation/menu labels;
- Guide examples/content used by visible Guide and launcher surfaces;
- Calculus identity and provenance badge helpers for display text and class assembly;
- virtual keyboard layout builders;
- named-variable editor Latex insertion.

These are public or shell-facing seams. They should remain allowed unless a future audit replaces them with narrower shell-specific facades.

### Risky Private Solver / Runtime Imports To Avoid Later

Future app shell/workspace/component code should avoid direct imports from:

- private Equation districts such as guarded internals, isolation internals, candidate/target private modules, polynomial/numeric/direct-symbolic worker districts, and inequality internals;
- private Algebra districts such as polynomial-factor, polynomial-elimination, transform-core, variable-core, variable-memory internals, domain-range internals, radical/absolute-value internals, rational-function internals, and inequality internals;
- private Symbolic Engine districts such as integration, radical, rational, limits, mixed-factor, power-log, or patterns internals;
- private Engine districts such as math-engine internals and semantic-planner internals;
- private Calculus engine modules unless a workspace-specific public helper is explicitly documented;
- OOE runtime-control, job-launch, diagnostics, bridge-schema, and events internals outside `OoeDiagnosticsPanel` and the existing shell error-boundary/diagnostics seams;
- worker entrypoints and worker clients;
- app-state persistence, schema parsing, or variable-memory storage internals;
- Playground/source mirrors or source-mirror path literals.

## Current Tensions

- `OoeDiagnosticsPanel` is a deliberately privileged developer panel. It directly reads OOE diagnostics/event surfaces and should remain isolated from normal shell/workspace components.
- `CompartmentErrorBoundary` writes UI-boundary records into the compartment layer. That is intentional for shell/workspace containment, but it should stay shallow and serializable.
- `DisplayPanel` still has broad props because it is the visible result shell. Further narrowing should happen through a DisplayPanel model/shell audit, not by importing app runtime internals into Display components.
- Workspace components import some public math/workbench helpers for display metadata. Future validators should distinguish public workspace metadata from private solver engines.

## Future Validator Candidates

Good next candidates after this audit:

- `src/app/workspaces/**` and normal `src/components/**` may not import OOE runtime-control, job-launch, bridge-schema, events, or diagnostics internals.
- `src/app/workspaces/**` may import public mode/workspace facades, navigation metadata, examples, and display-safe workbench helpers, but may not import private solver districts.
- `src/app/shell/**` may import DisplayPanel private shell components and compartment UI-boundary helpers, but normal shell components may not import OOE runtime-control internals.
- `src/components/OoeDiagnosticsPanel.tsx` may remain an exact-path exception for OOE diagnostics/events developer UI.
- `src/app/shell/CompartmentErrorBoundary.tsx` may remain an exact-path exception for compartment UI-boundary recording.
- `src/app/shell/display-panel/**` may import Display facades and result/scheduling helpers, but should not import OOE lifecycle/control internals.
- `src/components/**` may import reusable Display facades, editor analysis hooks, calculator public types, variable hints, and named-variable helpers, but should not import app-state persistence or private variable-memory storage.

Candidates that should wait:

- Do not forbid all workspace-to-public-workbench imports; Calculate, Calculus, Trigonometry, Statistics, Geometry, and Linear Algebra still use public metadata/helpers for visible UI state.
- Do not ban `OoeDiagnosticsPanel` diagnostics imports without first adding a narrow diagnostics-panel facade.
- Do not ban `CompartmentErrorBoundary` from the compartment record store; that is the current UI-boundary reporting seam.
- Do not force DisplayPanel prop-model changes in a validator milestone.

## High-Risk Contracts

- App shell can render, compose, route UI, and call app-runtime outputs, but must not become a second runtime authority.
- Workspaces can render guided inputs and pass callbacks, but must not own solver internals or OOE host decisions.
- OOE remains the only authority for job lifecycle, cancellation, stale-drop, host selection, and commit legality.
- The compartment projection is derived state. UI-boundary records can inform diagnostics, but they do not emit OOE lifecycle events.
- Display wording, exact Latex, branch policy, copy/to-editor behavior, history/replay compatibility, schemas, worker-host ids, and capability ids remain outside this audit.

## Stop Rules

- Stop if a future rule requires changing component behavior, workspace props, DisplayOutcome shape, solver output, OOE event types, diagnostics retention, history/replay schemas, CSS selectors, or worker-host identities.
- Stop if a rule would classify a known public workspace metadata facade as private without a replacement facade.
- Stop if a rule would require a broad bus, runtime registry, command authority, plugin layer, SDK, Surface Protocol, or generated source.
- Stop if enforcing a rule would require moving source inside an `AUDIT0` milestone.

## Verification

Docs-only gate:

- `npx tsc -b --pretty false`
- `npm run test:compartments-boundaries`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
