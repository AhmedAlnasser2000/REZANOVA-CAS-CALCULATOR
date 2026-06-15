# Supercarrier Compartment Contracts

Status: `COMPARTMENTS0` audit/spec record with `COMPARTMENTS1` and `COMPARTMENTS-VALIDATOR-EXPANSION1` read-only enforcement records

Purpose: define the first Calcwiz Supercarrier compartment contract over the repository's existing districts. This milestone documents ownership, dependency expectations, diagnostics/event posture, and future validator shape. It does not add a runtime registry, command bus, plugin API, Surface Protocol, SDK, reducer, remote-compute protocol, or new execution layer.

## Boundary Statement

Supercarrier is Calcwiz's maintainability, control, contributor-safety, diagnostics, extension, and compartment contract system. It formalizes existing district boundaries so future work has declared ownership and failure-localization rules.

Standing separation:

```text
OOE = runtime traffic control.
OOE event outbox = OOE lifecycle fact reporting.
Supercarrier compartments = damage containment plus ownership boundaries.
Surface Protocol = future external embedding/integration contract.
```

Supercarrier must formalize the current modular monolith before it attempts code-level registry or platform behavior. The first implementation after this spec should be a small read-only validator, not a broad framework.

## Contract Fields

Each future compartment contract should declare:

- `id`: stable kebab-case compartment id.
- `title`: human-readable name.
- `purpose`: what the compartment owns and why it exists.
- `owned paths`: source, style, docs, tests, and memory-adjacent paths that primarily belong to it.
- `public entrypoints`: imports that other compartments may use.
- `internal entrypoints`: district/private paths that should not be imported across compartment boundaries except by explicitly listed owners.
- `allowed dependencies`: upstream compartments this compartment may consume.
- `forbidden dependencies`: imports that should fail future boundary checks.
- `OOE usage`: whether it builds OOE requests, runs under OOE, observes OOE, or stays OOE-free.
- `event usage`: whether it emits OOE events, reads OOE events, or should stay event-silent.
- `diagnostics label`: preferred label for diagnostics, future event filtering, and provenance.
- `failure boundary`: what may fail locally without corrupting other compartments.
- `fallback behavior`: expected degraded behavior, if any.
- `test coverage`: focused tests that prove the contract.
- `future surface exposure`: `none`, `internalOnly`, or `candidate`.

## Initial Compartment Catalog

This catalog is intentionally repo-grounded. It names the compartments visible in current source layout and recent architecture records.

| ID | Current owned paths | Public entrypoints / seams | OOE and event posture | Readiness |
| --- | --- | --- | --- | --- |
| `app-shell` | `src/AppMain.tsx`, `src/App.css`, `src/app/shell/`, `src/app/workspaces/`, `src/components/`, `src/styles/app/` | App components and shell props only | Observes OOE diagnostics; delegates runtime launches to app runtime and mode hooks | Needs stricter prop/model contracts before validator |
| `app-runtime` | `src/app/runtime/`, `src/app/logic/` | Runtime hooks and routing helpers consumed by AppMain | Builds workspace OOE launches through OOE APIs; should not own solver logic | Ready for boundary documentation; validator must be careful around app shell imports |
| `app-state-history-variables` | `src/lib/app-state/`, `src/lib/algebra/variable-memory/`, `src/lib/algebra/variable-memory.ts`, `src/lib/algebra/variable-memory-store.ts`, `src/lib/algebra/variable-hints.ts`, `src/lib/algebra/named-variable.ts` | App-state schemas, settings, history parsing, variable memory APIs | Supplies request context; should not emit OOE lifecycle events | Audited for boundary shape; strict validator should preserve app-state persistence and variable-memory public facades |
| `OOE` | `src/lib/ooe/`, `src-tauri/src/ooe/` | `bridge-schema/`, `job-launch/`, `runtime-control/`, `diagnostics/`, `events/`, `pilots/` direct districts | Owns runtime traffic control and emits OOE lifecycle facts | Ready for first validator candidate |
| `Display` | `src/lib/display/`, `src/app/shell/DisplayPanel.tsx`, `src/app/shell/display-panel/` | Stable Display facades plus private DisplayPanel components | Reads committed outcomes; should not decide OOE commits or emit lifecycle events | Mostly ready; DisplayPanel remains app-shell-adjacent |
| `Calculate` | `src/lib/modes/calculate.ts`, `src/lib/modes/calculate/`, Calculate runtime hook and workspace shell pieces | `runCalculateMode`, Calculate mode facade, runtime hook outputs | Builds Calculate OOE requests; workers run through OOE | Ready after mode/app-runtime boundary is documented |
| `Equation` | `src/lib/equation/`, `src/lib/modes/equation.ts`, `src/lib/modes/equation/`, Equation runtime hook and workspace shell pieces | Root Equation facades, Equation mode facade | Builds Equation OOE requests; direct-symbolic worker remains Equation-owned under OOE hosting | Ready, with many stable facades that validators must respect |
| `Calculus` | `src/lib/calculus/`, `src/lib/modes/calculus.ts`, Calculus runtime hook and workspace shell pieces | Calculus identity, workbench, strategy roots; workspace and engine districts | Builds Calculus OOE requests; workers run through OOE | Ready after legacy Advanced Calculus removal; preserve current canonical names |
| `Trigonometry` | `src/lib/trigonometry/`, Trig mode/runtime/workspace pieces | Trig mode/workspace APIs | Builds Trig OOE requests; uses shared Algebra/Symbolic/Display | Needs a focused contract before strict validator |
| `Geometry` | `src/lib/geometry/`, Geometry runtime/workspace pieces | Geometry mode/workspace APIs | Builds Geometry OOE requests; worker-hosted where applicable | Needs geometry split/audit state refreshed before strict validator |
| `Statistics` | `src/lib/statistics/`, Statistics runtime/workspace pieces | Statistics mode/workspace APIs | Builds Statistics OOE requests; worker-hosted where applicable | Ready for cataloging, validator later |
| `LinearAlgebra` | `src/lib/linear-algebra/`, Matrix/Vector workspace pieces, shared linear-algebra worker runtime | Matrix and Vector public mode surfaces | Builds Matrix/Vector OOE requests; shares host runtime intentionally | Needs explicit Matrix/Vector sub-capability note before validator |
| `Table` | Table mode/runtime/workspace pieces, table worker runtime | Table mode public surface | Builds Table OOE requests; OOE pilot consumes table-core request data | Ready after prior OOE/table cycle fixes |
| `Algebra` | `src/lib/algebra/` | Algebra root facades and district helpers | Shared capability layer; should not depend on app shell or OOE | Ready for validator candidate with facade allowlist |
| `SymbolicEngine` | `src/lib/symbolic-engine/` | Symbolic Engine root facades and districts | Shared backend; should not depend on app shell or OOE | Ready for validator candidate |
| `Engine` | `src/lib/engine/` | Math engine and semantic planner facades | Mode-facing execution/planning bridge; should not own OOE policy | Ready for validator candidate |
| `Guide` | `src/lib/guide/`, Guide runtime/workspace pieces | Guide content/search/navigation APIs | Launches examples through app shell; should not run solvers directly | Needs content-id stability note before validator |
| `NavigationInputKernel` | `src/lib/navigation/`, `src/lib/input/`, `src/lib/kernel/`, `src/lib/editor/`, `src/lib/numeric/`, `src/lib/virtual-keyboard/` | Shared parser/editor/navigation/keypad primitives | Mostly OOE-free; may feed request construction | Needs subdivision before strict validator |
| `Labs` | `src/lib/labs/`, `src/app/shell/LabsPanel.tsx`, labs styles | Developer/experimental surfaces | Should not emit production OOE events unless promoted | Needs explicit incubation policy |
| `Playground` | `playground/` | No production imports | Must not be imported by production source | Ready for validator as forbidden production dependency |
| `SourceMirrors` | `playground/sources/mirrors/` | Reference-only source mirrors | Must not be imported or embedded in production/events | Ready for validator as forbidden production dependency |

## Dependency Policy

Initial dependency rules for a future validator:

- App shell may depend on app runtime, Display panel components, Guide, and workspace components, but should not import solver internals directly.
- App runtime may depend on OOE, Modes, app-state, variable memory, and workspace-specific runtime hooks, but should not import React component trees except through explicit shell-facing props.
- OOE may depend on its bridge schemas, job launch, runtime-control, diagnostics, events, and pilots. OOE pilots may consume narrow route snapshots and mode runtime request shapes. OOE core must not import React, AppMain, DisplayPanel, Playground, or source mirrors.
- Display may render outcomes and format math. It must not decide commit legality, cancellation, stale drops, or solver execution.
- Modes/workspaces may construct requests and call shared math layers. They should not own Algebra/Symbolic/Engine internals.
- Algebra, SymbolicEngine, Calculus engine, Equation solver districts, and Engine are shared compute/planning layers. They must stay app-shell-free.
- Playground and SourceMirrors are reference/incubation areas only. Production `src/**` and OOE events must not embed source mirror paths or objects.

## Event And Diagnostics Policy

OOE is currently the only event emitter. `src/lib/ooe/events/event-outbox.ts` reports OOE lifecycle facts after OOE decisions. Other compartments should not add their own event streams before `COMPARTMENTS1`.

For `COMPARTMENTS1`, the validator may allow compartments to declare future event labels, but it should not let them emit events yet. Compartment failure/recovery events belong to `COMPARTMENTS2` or later.

Diagnostics labels should initially reuse existing route/capability labels instead of inventing new names. A future mapping can normalize display labels once the contract is stable.

`COMPARTMENTS-DIAGNOSTICS-LABELS1` adds the first OOE-owned descriptive compartment labels to event snapshots. The labels are resolved from OOE lifecycle facts and shown in the developer diagnostics event timeline. They are not a bus, registry, routing input, or command authority; unknown/test routes stay unlabeled.

## Surface Protocol Policy

Surface Protocol remains future context. `COMPARTMENTS0` does not expose external APIs. Future Surface work must consume filtered, stable summaries; it must not expose raw OOE events, diagnostics records, solver objects, React props, DOM nodes, source mirror paths, or local filesystem data.

## Readiness For `COMPARTMENTS1`

`COMPARTMENTS1` is allowed only after this document is accepted as the initial contract. The first code milestone should be a lightweight, read-only validator that checks obvious path/import boundaries:

- OOE core does not import React/app shell/DisplayPanel/Playground/source mirrors.
- Production `src/**` does not import `playground/sources/mirrors/**`.
- App shell imports do not bypass mode/runtime facades into deep solver districts unless explicitly allowlisted.
- Shared compute layers do not import app shell, OOE runtime control, diagnostics UI, or styles.
- Root facades and known compatibility seams are allowlisted rather than deleted.

The validator should report only. It should not change runtime behavior, OOE events, app routing, solver execution, display policy, history schemas, or worker bundling.

## `COMPARTMENTS1` Enforcement Record

`COMPARTMENTS1` adds the first read-only Supercarrier enforcement seam:

- `tools/compartment-boundaries-core.mjs`
- `tools/validate-compartment-boundaries.mjs`
- `tools/validate-compartment-boundaries.test.mjs`
- package script `test:compartments-boundaries`

The validator intentionally enforces only high-confidence rules:

- production `src/**` cannot import or embed source-mirror paths from `playground/sources/mirrors/**`;
- shared compute layers (`src/lib/algebra`, `src/lib/symbolic-engine`, and `src/lib/engine`) cannot import app shell, React components, styles, OOE lifecycle/diagnostics/event districts, Playground, or source mirrors;
- app shell/runtime/component code cannot deep-import known private solver districts, while current public facades and compatibility seams remain allowed;
- the existing OOE boundary validator remains the source of truth for OOE-specific rules and is called by the compartment validator.

This is not a runtime registry, bus, command layer, Surface Protocol, plugin system, SDK, or compartment brain. It reads imports/text, reports violations, and exits nonzero when a checked boundary is crossed.

## `COMPARTMENTS-VALIDATOR-EXPANSION1` Enforcement Record

`COMPARTMENTS-VALIDATOR-EXPANSION1` keeps the same read-only validator and expands only high-confidence rules that match the current repository:

- library compartments such as Modes, Guide, Display, Navigation/Input/Kernel/Editor/Numeric/Virtual Keyboard, Trigonometry, Geometry, Statistics, Linear Algebra, Calculus, and Equation cannot import app shell, React components, or styles;
- Display library code cannot import OOE runtime-control, diagnostics, events, or app runtime surfaces;
- Guide and Labs library code cannot deep-import private solver districts;
- the current Calculus workspace ODE-to-app-state/Tauri seam remains explicitly allowed until a later workspace boundary pass.

The validator still delegates OOE-specific checks to `validateOoeBoundaries()`. This milestone does not add warning infrastructure, source rewrites, runtime labels, event behavior, or Surface Protocol work.

## `COMPARTMENTS-DIAGNOSTICS-LABELS1` Diagnostics Record

`COMPARTMENTS-DIAGNOSTICS-LABELS1` adds optional compartment metadata to OOE event envelopes and diagnostics event rows:

- `compartmentId`
- `compartmentLabel`

The current resolver maps known OOE lifecycle facts to the compartment catalog:

- `expression.evaluate` and `calculate.*` -> `calculate`
- `equation.*` -> `equation`
- `calculus.*` -> `calculus`
- `trigonometry.*` -> `trigonometry`
- `statistics.*` -> `statistics`
- `geometry.*` -> `geometry`
- `linearAlgebra.matrix` / `linearAlgebra.vector` -> `linear-algebra`
- `table.*` -> `table`
- `editor.*` -> `navigation-input-kernel`

The labels are descriptive and developer-facing. They do not change execution authority, event types, event payload semantics, diagnostics retention, cancellation, stale drops, commit decisions, host selection, schemas, or Surface Protocol boundaries.

## `COMPARTMENTS-DIAGNOSTICS-FILTER1` Diagnostics Record

`COMPARTMENTS-DIAGNOSTICS-FILTER1` makes the descriptive labels actionable inside the existing developer-only OOE diagnostics panel. The panel now has an event-compartment filter backed by the OOE-owned compartment option list.

The filter applies only to lifecycle event timeline rows. It does not filter diagnostics records, active jobs, recent jobs, OOE event storage, event emission, event retention, routing, cancellation, stale drops, commit decisions, host selection, schemas, or Surface Protocol boundaries. Unknown/test events stay unlabeled and are visible only when the filter is `All`.

## `COMPARTMENTS-DIAGNOSTICS-TABS1` Diagnostics Record

`COMPARTMENTS-DIAGNOSTICS-TABS1` makes the OOE diagnostics panel easier to read by separating it into `Records`, `Events`, and `Jobs` tabs. The tab split preserves the existing diagnostics roles:

- `Records`: terminal diagnostics-buffer records, with status/query filters and selected raw-record copy behavior.
- `Events`: OOE lifecycle events, with the compartment filter and compact event rows only.
- `Jobs`: active/recent job rows, with status/query filters and selected raw-record copy behavior.

The tabs are UI organization only. They do not change OOE event emission, event retention, diagnostics records, job registry state, runtime routing, cancellation, stale drops, commit decisions, host selection, schemas, Surface Protocol boundaries, bus behavior, or Supercarrier enforcement.

## `COMPARTMENTS-APP-RUNTIME-BOUNDARY-AUDIT0` Audit Record

`COMPARTMENTS-APP-RUNTIME-BOUNDARY-AUDIT0` documents the current `src/app/runtime/` and `src/app/logic/` boundary before adding stricter validator rules. The audit classifies:

- intended app shell/runtime seams;
- OOE launch/control seams;
- mode facade/runtime seams;
- app-state/history/variable-memory seams;
- allowed public solver/navigation facades;
- risky private solver, UI component, style, worker, Playground, and source-mirror imports to avoid later.

The audit is docs/memory only. It does not add enforcement, move code, rewrite imports, introduce a bus or Surface Protocol, or change OOE/runtime, solver, Display, schema, worker-host, capability, history/replay, CSS, or reserved-symbol behavior. Future validator work should start from the exact app-runtime rules documented in `app-runtime-boundary-audit.md`.

## `COMPARTMENTS-APP-RUNTIME-VALIDATOR1` Enforcement Record

`COMPARTMENTS-APP-RUNTIME-VALIDATOR1` adds the first app-runtime-specific checks to the read-only Supercarrier validator. Production `src/app/runtime/**` and `src/app/logic/**` files now fail validation if they import app shell/workspace/component/style surfaces, mode worker entrypoints or clients, unaudited OOE districts, or known private solver districts.

The validator initially kept exact allowlists for the current app-runtime seams: OOE job-launch contracts/tickets/active registry, the workspace pilot, the transitional diagnostics summary seam, public mode facades, app-state/Tauri, calculator types, Equation/Calculus route metadata, Guide/navigation/input/editor/virtual-keyboard, Algebra transform UI, named-variable, and variable hints.

This is enforcement only. It does not change runtime launch behavior, OOE lifecycle events, diagnostics retention, solver execution, Display policy, schemas, worker-host identities, or Surface Protocol boundaries.

## `APP-RUNTIME-OOE-SUMMARY-SEAM1` Cleanup Record

`APP-RUNTIME-OOE-SUMMARY-SEAM1` removes the app-runtime dependency on OOE diagnostics internals. `src/app/logic/modeActionHandlers.ts` now uses a narrow OOE pilot/provenance summary helper, and the validator allowlist now permits that seam instead of `src/lib/ooe/diagnostics/diagnostics-buffer`.

The helper delegates to the existing diagnostics summarizer, so provenance output summaries, unsafe marker detection, diagnostics records, lifecycle events, routing, cancellation, stale-drop behavior, commit legality, schemas, worker-host ids, and Surface Protocol boundaries remain unchanged.

## `WORKSPACE-RUNTIME-REQUEST-FACADE-AUDIT0` Audit Record

`WORKSPACE-RUNTIME-REQUEST-FACADE-AUDIT0` records the current app-runtime dependency on workspace request-building helpers for Trigonometry, Statistics, and Geometry. The audit identifies direct imports from runtime hooks into parser, runtime-input, serializer, and shared workspace modules, and defines a future narrow runtime-request facade per workspace before stricter validator rules are added.

This keeps the Supercarrier enforcement path honest: app runtime can continue using the current request-building seams while the repo documents the intended replacement boundary. No source files moved, no validator rules changed, and no OOE request, replay, Guide, parser, serializer, solver, Display, schema, worker, bus, or Surface Protocol behavior changed.

## `APP-STATE-HISTORY-VARIABLES-BOUNDARY-AUDIT0` Audit Record

`APP-STATE-HISTORY-VARIABLES-BOUNDARY-AUDIT0` documents the app-state/history/variable-memory compartment before stricter rules are added. The audit maps app-state schemas and Tauri/web-preview persistence, history/display shell state, calculator-memory autosave, Algebra stored-variable policy, variable hints, and named-variable syntax.

The audit records future validator candidates without adding enforcement: app runtime can keep using app-state persistence helpers and calculator public types, shared code can keep using the `variable-memory.ts` root facade, app shell can keep using hint/named-variable presentation seams, and app runtime should eventually be barred from private `src/lib/algebra/variable-memory/**` modules.

No code moved, no schemas changed, no HistoryEntry or calculator-memory compatibility changed, no stored-value parser behavior changed, no replay behavior changed, and no OOE event, bus, Surface Protocol, solver, Display, Tauri command, or reserved-symbol behavior changed.

## `WORKSPACE-RUNTIME-REQUEST-FACADES1` Facade Record

`WORKSPACE-RUNTIME-REQUEST-FACADES1` creates the public request facade seams required before stricter app-runtime workspace rules can land:

- `src/lib/trigonometry/runtime-request.ts`
- `src/lib/statistics/runtime-request.ts`
- `src/lib/geometry/runtime-request.ts`

The facades let `src/app/runtime/**` use workspace-owned request parsing, serialization, source-sync, screen mapping, request types, and input-revision builders without importing parser/runtime-input/serializer/shared internals directly. The runtime hooks for Trigonometry, Statistics, and Geometry now consume those facades.

The change is a boundary cleanup only. It does not change workspace parser behavior, runtime request shapes, OOE launch evidence, history/replay behavior, solver behavior, Display policy, worker-host identities, bus behavior, or Surface Protocol boundaries.

## `COMPARTMENTS-WORKSPACE-RUNTIME-VALIDATOR1` Enforcement Record

`COMPARTMENTS-WORKSPACE-RUNTIME-VALIDATOR1` expands the read-only Supercarrier validator with the workspace request boundary enabled by the new facades. App runtime and logic files may import Trigonometry, Statistics, and Geometry `runtime-request` facades plus existing public navigation/examples/mode/core-mode seams.

The validator now fails app-runtime direct imports from workspace request-building internals (`parser`, `runtime-input`, `serializer`, Statistics `shared`) and high-confidence math-core internals in Trigonometry, Statistics, and Geometry.

This is import-boundary enforcement only. It does not rewrite files, create a generic workspace framework, alter OOE routing, change runtime request behavior, change solvers, change Display policy, add a bus, or introduce Surface Protocol.

## `APP-STATE-HISTORY-VARIABLES-VALIDATOR1` Enforcement Record

`APP-STATE-HISTORY-VARIABLES-VALIDATOR1` expands the read-only Supercarrier validator with the app-state/history/variables rules documented by the boundary audit.

The validator keeps app runtime/logic allowed to import `src/lib/app-state/tauri`, calculator public types, the public `variable-memory.ts` facade, `variable-hints.ts`, and `named-variable.ts`. It keeps `src/AppMain.tsx` as the current top-level bootstrap/persistence orchestrator.

The validator now fails app runtime/logic imports from app-state schemas, private `src/lib/algebra/variable-memory/**` modules, and `variable-memory-store.ts`. It also fails direct app-state persistence imports from `src/app/shell/**` and `src/components/**`, and blocks shared compute layers from importing app-state/Tauri persistence.

This is enforcement only. It does not alter schemas, HistoryEntry compatibility, calculator-memory snapshots, stored-value parsing, replay behavior, Tauri commands, OOE events, bus behavior, Surface Protocol boundaries, solver behavior, Display policy, or reserved-symbol behavior.

## `APP-STATE-PERSISTENCE-SEAM1` Seam Record

`APP-STATE-PERSISTENCE-SEAM1` adds `src/lib/app-state/persistence.ts` as the preferred app-runtime persistence seam for the AppMain persistence shell. The seam delegates to `tauri.ts`, preserving existing Tauri/web-preview persistence behavior while giving later validators a narrower path to enforce.

For now, app runtime/logic may still import `src/lib/app-state/tauri` directly where existing hooks already do so. The broader persistence firewall is deferred.

## `COMPARTMENTS-APPMAIN-BOOTSTRAP-VALIDATOR1` Enforcement Record

`COMPARTMENTS-APPMAIN-BOOTSTRAP-VALIDATOR1` tightens the read-only Supercarrier validator so `src/AppMain.tsx` is no longer a persistence bootstrap escape hatch. AppMain may import `src/app/runtime/useAppPersistenceRuntime.ts`, but direct AppMain imports from `src/lib/app-state/**` and `src/lib/algebra/variable-memory-store.ts` now fail validation.

The last AppMain mode-persistence call now goes through the app-runtime persistence hook, which delegates to the app-state persistence seam. The milestone does not yet ban all app-runtime `src/lib/app-state/tauri` imports; that broader firewall remains future work.

This is boundary enforcement only. It does not change schemas, HistoryEntry compatibility, calculator-memory snapshots, persisted mode semantics, stored-value parsing, replay behavior, Tauri commands, OOE events, bus behavior, Surface Protocol boundaries, solver behavior, Display policy, or reserved-symbol behavior.

## `APPMAIN-DIRTY-SIGNAL-TIDY1` Cleanup Record

`APPMAIN-DIRTY-SIGNAL-TIDY1` removes lint friction from the AppMain persistence shell by replacing the empty-object dirty signal with a named object that explicitly references the same calculator-memory inputs.

The change keeps the persistence shell behavior intact and does not add new validator rules. It is included here only as a record that the AppMain persistence-shell warning was closed before tightening the broader app-runtime persistence firewall.

## `APP-RUNTIME-PERSISTENCE-FIREWALL1` Enforcement Record

`APP-RUNTIME-PERSISTENCE-FIREWALL1` expands the app-state persistence seam and tightens the read-only Supercarrier validator. App runtime and logic may import `src/lib/app-state/persistence.ts`, but direct production imports from `src/lib/app-state/tauri.ts` are no longer allowed.

The firewall is intentionally app-runtime scoped. `tauri.ts` remains app-state-owned implementation code, and tests may still exercise it directly as the behavior authority.

No schemas, HistoryEntry compatibility, calculator-memory snapshots, launcher categories, history persistence, stored-value parsing, replay behavior, Tauri commands, OOE events, bus behavior, Surface Protocol boundaries, solver behavior, Display policy, or reserved-symbol behavior changed.

## Stop Rules

- Stop if the work requires changing source imports, runtime launch paths, schemas, solver behavior, DisplayOutcome shape, OOE event types, diagnostics wording, CSS selectors, worker host ids, capability ids, or history/replay contracts.
- Stop if the compartment list would force ownership changes that existing docs have not audited.
- Stop if a proposed contract would require deleting root facades that are still public stable surfaces.
- Stop if Surface Protocol, plugin API, SDK, remote compute, or public embedding work enters the milestone.

## Verification

For this docs-only milestone:

- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

For a later validator milestone:

- Add validator unit tests before enforcing new boundaries.
- Run the existing OOE boundary tests as an adjacent guard, not as a replacement for Supercarrier checks.
