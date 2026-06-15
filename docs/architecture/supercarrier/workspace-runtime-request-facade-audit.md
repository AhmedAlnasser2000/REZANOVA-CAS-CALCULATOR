# Workspace Runtime Request Facade Audit

Status: `WORKSPACE-RUNTIME-REQUEST-FACADE-AUDIT0` docs-only boundary audit.

Purpose: document the current app-runtime to workspace-request import surface before adding stricter Supercarrier rules. This audit covers the Trigonometry, Statistics, and Geometry runtime hooks that still assemble OOE workspace requests by importing parser, runtime-input, serializer, and shared request helpers directly.

This audit does not move source, add enforcement, rename facades, alter OOE request shapes, change parser behavior, or introduce a bus, runtime registry, Surface Protocol, command authority, solver behavior change, replay/history change, or display policy change.

## Scope

Primary app-runtime consumers:

- `src/app/runtime/useTrigonometryRuntime.ts`
- `src/app/runtime/useStatisticsRuntime.ts`
- `src/app/runtime/useGeometryRuntime.ts`
- `src/app/runtime/useShellFocusRuntime.ts`
- `src/app/logic/windowKeyRouter.ts`

Workspace surfaces currently consumed by app runtime:

- `src/lib/trigonometry/examples.ts`
- `src/lib/trigonometry/navigation.ts`
- `src/lib/trigonometry/parser.ts`
- `src/lib/trigonometry/runtime-input.ts`
- `src/lib/trigonometry/serializer.ts`
- `src/lib/statistics/examples.ts`
- `src/lib/statistics/navigation.ts`
- `src/lib/statistics/parser.ts`
- `src/lib/statistics/runtime-input.ts`
- `src/lib/statistics/shared.ts`
- `src/lib/geometry/examples.ts`
- `src/lib/geometry/navigation.ts`
- `src/lib/geometry/parser.ts`
- `src/lib/geometry/runtime-input.ts`
- `src/lib/geometry/serializer.ts`
- `src/lib/modes/core-mode.ts`
- public mode facades for runtime execution: `src/lib/modes/trigonometry.ts`, `src/lib/modes/statistics.ts`, and `src/lib/modes/geometry.ts`

Out of scope:

- Equation and Calculus route metadata, because those already have heavier dedicated audits and runtime hooks.
- Mode worker clients and entrypoints.
- OOE runtime-control, diagnostics, and event emission.
- Workspace implementation splits inside Trigonometry, Statistics, or Geometry.

## Current Import Map

### Stable Workspace Seams

These imports are app-runtime-facing today and can remain allowed by future validators:

- navigation metadata and menu movement helpers used by shell focus and keyboard routing;
- examples used for Guide/example seeding and replay restoration;
- public mode facades used for lazy runtime execution;
- `src/lib/modes/core-mode.ts` draft helpers used by guided workspaces with editable shared-core drafts.

These are intentional because app runtime owns live focus, menu movement, replay restoration, and launch orchestration.

### Request-Assembly Seams

These imports are valid today but are too granular for a future app-runtime validator:

- Trigonometry: `parser`, `runtime-input`, and `serializer`.
- Statistics: `parser`, `runtime-input`, and `shared`.
- Geometry: `parser`, `runtime-input`, and `serializer`.

The current hooks use these helpers to translate guided screen state into runtime request envelopes and route snapshots. That keeps behavior centralized in each workspace library, but it makes app runtime aware of the workspace's internal request-building pieces.

## Responsibility Map

App runtime owns:

- live guided workspace state and refs;
- current screen/menu/focus routing;
- replay restoration into screen-local drafts;
- building the current OOE launch context from live state;
- calling public mode facades or OOE workspace launch helpers;
- passing history tickets and commit callbacks.

Workspace libraries own:

- parser behavior;
- serializer behavior;
- request type contracts;
- screen-to-request and request-to-screen mapping;
- example seed shapes;
- route metadata and guided screen catalogs;
- workspace math behavior and result wording.

OOE owns:

- host routing;
- cancellation;
- stale-drop and commit legality;
- runtime envelope evidence;
- lifecycle event emission.

## Future Facade Candidates

Before tightening app-runtime import rules around these workspaces, add one public request facade per workspace. The likely shape:

- `src/lib/trigonometry/runtime-request.ts`
- `src/lib/statistics/runtime-request.ts`
- `src/lib/geometry/runtime-request.ts`

Each facade should re-export only the app-runtime-facing request assembly surface needed by the runtime hooks:

- parse a draft into the workspace request/result shape;
- serialize a request into a stable draft;
- map request to screen/working source where needed;
- expose runtime input types used by OOE launch snapshots;
- expose route snapshot builders if they are already workspace-owned.

The facade should not become a generic workspace framework. It should be a narrow public import boundary over each workspace's existing parser/serializer/runtime-input helpers.

## Future Validator Candidates

After the runtime-request facades exist, the Supercarrier validator can safely add these app-runtime rules:

- app runtime may import workspace `navigation`, `examples`, `runtime-request`, public mode facades, and `core-mode`;
- app runtime may not import workspace `parser`, `serializer`, `shared`, or private parsing subfolders directly;
- app runtime may not import workspace math core modules such as Trigonometry equations/identities, Statistics inference/engine, or Geometry shape solver internals;
- app runtime tests may continue importing public mode facades for mocks and compatibility coverage.

Do not add those rules before the facades exist, because the current runtime hooks still need direct request-building imports to preserve behavior.

## High-Risk Contracts

- Parser and serializer behavior must remain byte-for-byte compatible from the caller's perspective.
- Runtime request shapes and route snapshot metadata must remain stable for OOE launch evidence and replay.
- Guide/example launch seeds must remain accepted by the existing workspace hooks.
- History/replay screen restoration must not lose screen, draft, or working-source state.
- Public mode facades must keep worker/main-thread routing unchanged.
- DisplayOutcome wording, result source labels, and solver behavior are outside this audit.

## Stop Rules

- Stop if a facade would require changing request types, parser behavior, serializer output, replay seed fields, OOE route snapshots, or workspace result wording.
- Stop if a validator rule would force source movement before a replacement facade exists.
- Stop if a proposed shared runtime-request framework starts absorbing workspace-specific behavior.
- Stop if the work touches worker host identity, OOE event types, Surface Protocol, schemas, Guide content ids, CSS, or Display policy.

## Verification

Docs-only gate:

- `npx tsc -b --pretty false`
- `npm run test:compartments-boundaries`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
