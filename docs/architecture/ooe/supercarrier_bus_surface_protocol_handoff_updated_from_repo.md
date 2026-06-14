# Updated Handoff: OOE Event Outbox, Supercarrier Compartments, and Future Surface Protocol

Status: updated architecture handoff after inspecting the latest uploaded repo zip: `REZANOVA-CAS-CALCULATOR-main (5).zip`  
Purpose: give Codex an accurate, repo-grounded direction for the next architecture work around OOE reporting, the minimal bus/outbox, Supercarrier, and future Surface Protocol without inventing systems that are not already present.

---

## 0. Current repo reality after latest architecture work

The repo has changed substantially since the earlier handoff.

The biggest shift is that the codebase is already moving toward a **district/facade architecture**. This is not yet the full Supercarrier system, but it is clearly a precursor to it.

Current important facts:

- OOE is no longer a flat `src/lib/ooe/*` surface.
- OOE TypeScript traffic-control internals are now grouped into districts:
  - `src/lib/ooe/bridge-schema/`
  - `src/lib/ooe/job-launch/`
  - `src/lib/ooe/runtime-control/`
  - `src/lib/ooe/diagnostics/`
  - `src/lib/ooe/pilots/`
- OOE intentionally uses **direct district imports with no root compatibility stubs**.
- App runtime has been split into multiple AppMain-facing runtime hooks under `src/app/runtime/`.
- DisplayPanel has been split into private app-shell display-panel modules:
  - `DisplayResultBlocks.tsx`
  - `DisplayEditorSurface.tsx`
  - `DisplayPreviewSurface.tsx`
  - `DisplayOutcomeShell.tsx`
  - `useDisplayRenderQueue.ts`
- Architecture docs are now grouped by ownership area under `docs/architecture/`.
- The repo has explicit docs warning against introducing a global event bus, Surface Protocol, Supercarrier implementation, plugin platform, SDK, or remote-compute protocol inside unrelated structure slices.

Important consequence:

> Any bus/Supercarrier work from here must be treated as its own explicit milestone, not smuggled into OOE cleanup, AppMain slimming, Display cleanup, or facade/district movement.

---

## 1. OOE is already established and must remain the execution authority

OOE means **Order Of Execution**.

OOE is the app's execution authority / runtime traffic controller.

OOE currently owns or coordinates:

- job identity
- input revision identity
- active/recent job lifecycle
- cancellation request state
- stale result / commit assessment
- launch-ticket behavior
- runtime host metadata
- worker/fallback evidence
- runtime envelopes
- OOE provenance and trace events
- diagnostics records
- runtime-shell execution wrappers
- worker-primary explicit workspace runs

OOE is not:

- a solver
- a renderer
- a React UI layer
- a general app event bus
- a Surface Protocol implementation
- a plugin system
- a Supercarrier compartment system
- a Progressive Solver implementation

Permanent rule:

```text
OOE decides.
Bus/outbox reports.
Supercarrier contains and organizes.
Surface Protocol exposes externally later.
```

---

## 2. Current OOE districts and what each owns

### `bridge-schema/`

Owns TypeScript bridge schemas and descriptor access:

- OOE plan/host descriptor schemas
- Tauri bridge fallback handling
- commit assessment types
- trace/event wire schemas mirrored from Rust
- zod validation

This is a schema/bridge district, not runtime execution.

### `job-launch/`

Owns job identity, active lifecycle, cancellation records, and launch tickets:

- `job-contract.ts`
- `active-job-registry.ts`
- `launch-tickets.ts`

This is where job IDs, input revisions, latest-only commit assessment, active/recent jobs, cancellation requests, and pending history tickets live.

### `runtime-control/`

Owns runtime execution wrappers and host metadata:

- `runtime-coordinator.ts`
- `runtime-envelope.ts`
- `runtime-shell-contract.ts`
- `host-adapter.ts`
- `trace.ts`

This is the best current place to integrate OOE lifecycle fact emission because `runtime-coordinator.ts` already sees job start, host resolution, preflight, runtime execution, commit assessment, cancellation, failure, and diagnostics recording.

### `diagnostics/`

Owns terminal diagnostics records and inspector-facing data:

- `diagnostics-buffer.ts`
- `diagnostics-inspector.ts`

This is not a chronological event stream. It records summarized terminal/runtime diagnostics and supports the dev OOE diagnostics panel.

### `pilots/`

Owns workspace/mode adapters that wrap existing mode runtimes with OOE metadata/provenance:

- Calculate
- Equation
- Calculus
- Geometry
- Linear Algebra
- Statistics
- Table
- Trigonometry
- Workspace pilot helpers

Pilots should not absorb solver logic, Display policy, or workspace UI ownership.

---

## 3. Immediate OOE consistency notes before bus work

The earlier host/plan mismatch around Geometry/Trigonometry worker metadata appears mostly fixed: `registry.rs` now derives node cancellation policy, thread safety, and result stability from the host descriptor instead of a fragile manual worker-host list.

However, one stale Rust test remains visible in the latest repo:

```rust
assert_eq!(list_builtin_hosts_for_command().len(), 14);
```

Current host descriptors include 19 host IDs:

- `calculus-runtime`
- `calculus-worker-runtime`
- `calculate-runtime`
- `calculate-worker-runtime`
- `editor-analysis-runtime`
- `equation-direct-symbolic-worker-runtime`
- `equation-runtime`
- `equation-worker-runtime`
- `expression-runtime`
- `geometry-runtime`
- `geometry-worker-runtime`
- `linear-algebra-runtime`
- `linear-algebra-worker-runtime`
- `statistics-runtime`
- `statistics-worker-runtime`
- `table-runtime`
- `table-worker-runtime`
- `trigonometry-runtime`
- `trigonometry-worker-runtime`

Recommended fix:

- Replace the magic host-count assertion with exact host-ID set assertions, or update it if the count is intentionally fixed.
- Prefer exact ID assertions over raw length assertions.
- If Cargo is available, run `cargo test --manifest-path src-tauri/Cargo.toml ooe`.

Local validation note from this analysis environment:

- `node --test tools/validate-ooe-boundaries.test.mjs` passed.
- `node tools/validate-ooe-boundaries.mjs` passed.
- `node --test tools/validate-file-sizes.test.mjs` passed.
- `node tools/validate-file-sizes.mjs` passed.
- `cargo` was not available in this environment, so Rust tests could not be executed here.
- `node_modules` were not present, so full Vitest/UI gates were not executed here.

---

## 4. Why the earlier handoff needs updating

The earlier handoff said “add OOE Event Outbox / minimal bus before Supercarrier.” That is still correct, but now it must be adjusted to the repo's new district/facade posture.

Do **not** add a broad global app bus.

Do **not** create an event bus inside an unrelated cleanup slice.

Do **not** use the bus to replace AppMain runtime hooks or OOE runtime control.

The updated plan should be:

```text
1. Fix the small OOE host-test consistency issue.
2. Add a dedicated OOE event/outbox district.
3. Use it only for OOE-owned lifecycle facts.
4. Let diagnostics observe it later.
5. Only after that, define Supercarrier compartments as a contract layer over existing districts.
```

---

## 5. Updated bus definition

The bus should be defined narrowly at first.

For this repo, the first bus should be:

> An OOE-owned event outbox that records and distributes typed, versioned facts emitted by OOE after OOE has made execution decisions.

It is not a general-purpose command bus.

It is not a reducer.

It is not a global app framework.

It does not run solvers.

It does not commit results.

It does not cancel jobs by itself.

It does not choose hosts.

It does not decide stale drops.

OOE does those things.

The outbox only reports them.

Core rule:

```text
Requests go to OOE.
Facts come out of OOE through the OOE Event Outbox.
```

Correct flow:

```text
Workspace / App runtime
  -> OOE request / OOE runtime shell
  -> OOE decides, routes, cancels, commits, stale-drops
  -> OOE emits facts through OOE Event Outbox
  -> Diagnostics / future Supercarrier / future Surface adapter observe those facts
```

Incorrect flow:

```text
Workspace publishes “run equation” to bus
  -> random listener runs solver
  -> random listener commits result
```

That incorrect flow must never happen.

---

## 6. Recommended new milestone: `OOE-EVENT-OUTBOX0`

Suggested milestone name:

```text
OOE-EVENT-OUTBOX0: Minimal OOE-owned event outbox
```

This is more precise than `BUS0` because it avoids implying a broad app bus.

### Goal

Add a small, OOE-owned, typed event stream for OOE lifecycle facts.

It should prepare for:

- better developer diagnostics
- future trace console / session replay
- future Supercarrier compartment failure reporting
- future Surface Protocol event filtering

It must not introduce:

- global app bus
- command bus
- reducer framework
- Surface Protocol
- Supercarrier implementation
- plugin API
- SDK
- remote compute protocol

---

## 7. Recommended location for OOE Event Outbox

Because OOE now uses direct districts, do not add a root file under `src/lib/ooe/` unless there is a deliberate reason.

Recommended location:

```text
src/lib/ooe/events/event-outbox.ts
src/lib/ooe/events/event-outbox.test.ts
```

Alternative if Codex judges this too small for a new district:

```text
src/lib/ooe/diagnostics/event-outbox.ts
src/lib/ooe/diagnostics/event-outbox.test.ts
```

Preferred: `events/` district.

Reason:

- `diagnostics/` currently owns terminal records and inspector rows.
- The event outbox is chronological lifecycle reporting, not the same thing as terminal diagnostics records.
- A separate `events/` district keeps the concept explicit and prevents `diagnostics-buffer.ts` from becoming a mixed event/record/log bucket.

If adding `src/lib/ooe/events/event-outbox.ts`, update:

- `tools/ooe-boundaries-core.mjs`
- OOE root surface docs
- OOE traffic-control docs
- `docs/architecture/README.md`

The boundary validator currently lists OOE core files by basename. Add `event-outbox.ts` and any helper file names to the allowed core set.

---

## 8. OOE Event Outbox event envelope

Suggested type:

```ts
export type OoeEventSeverity = 'debug' | 'info' | 'warning' | 'error';

export type OoeEventEnvelope = {
  eventId: string;
  sequence: number;
  type: OoeEventType;
  version: 1;
  timestamp: number;

  source: 'ooe';

  jobId?: string;
  registryId?: string;
  inputRevisionId?: string;
  planId?: string;
  capabilityId?: string;
  hostId?: string;
  nodeId?: string | null;
  phaseId?: string | null;
  workspaceId?: string;
  routeLabel?: string;

  severity: OoeEventSeverity;
  message?: string;
  payload?: Record<string, unknown>;
};
```

Keep payloads small and serializable.

Do not include:

- React objects
- DOM nodes
- solver instances
- full result trees
- huge exact LaTeX blocks
- table row arrays
- source mirror paths
- Playground objects
- private environment/local path data

---

## 9. First event type list

Start with OOE lifecycle facts that `runtime-coordinator.ts` can emit accurately.

Recommended first event types:

```ts
export type OoeEventType =
  | 'ooe.job.started'
  | 'ooe.host.selected'
  | 'ooe.preflight.completed'
  | 'ooe.preflight.failed'
  | 'ooe.checkpoint.recorded'
  | 'ooe.yield.performed'
  | 'ooe.result.committed'
  | 'ooe.result.staleDropped'
  | 'ooe.result.skipped'
  | 'ooe.job.cancelled'
  | 'ooe.job.failed'
  | 'ooe.job.completed';
```

Do not add event names for things not actually emitted.

Avoid command-like event names such as:

```text
run.job
cancel.job
commit.result
execute.solver
```

OOE requests and OOE facts must remain separate.

---

## 10. Event outbox APIs

Minimal APIs:

```ts
recordOoeEvent(input)
subscribeToOoeEvents(listener)
listOoeEvents()
getLatestOoeEvent(predicate?)
clearOoeEvents(options?)
```

Recommended retention:

```text
DEFAULT_OOE_EVENT_LIMIT = 300
```

or another small bounded value.

The outbox should be in-memory only for now.

No persistence.

No Surface Protocol.

No public API.

No normal-user UI.

---

## 11. Where to emit first

The safest first integration point is:

```text
src/lib/ooe/runtime-control/runtime-coordinator.ts
```

Reason: it already sees the full runtime lifecycle.

Emit events at these points:

### After job start

After `startOoeJob(...)` succeeds:

```text
ooe.job.started
```

Fields:

- registryId
- jobId
- inputRevisionId
- planId
- capabilityId
- hostId
- routeLabel

### After host adapter resolution

After `resolveOoeHostAdapter(...)`:

```text
ooe.host.selected
```

Fields:

- hostId
- host status
- host kind if ready
- thread safety if ready
- cancellation policy if ready

### After preflight

After `prepareStatus` / `prepareOoePlanPreflight`:

```text
ooe.preflight.completed
```

If preflight throws, the catch block can emit failure as part of `ooe.job.failed` or a specific `ooe.preflight.failed` only if the code can distinguish it cleanly.

### When cooperative checkpoints happen

Inside the existing `checkpoint()` and `yieldIfBudgetExceeded()` helpers, optionally record:

```text
ooe.checkpoint.recorded
ooe.yield.performed
```

Keep this small. Avoid noisy spam.

### On terminal commit assessment

After metadata and commit assessment:

- `ooe.result.committed`
- `ooe.result.staleDropped`
- `ooe.result.skipped`

Map from `metadata.commitAssessment`.

### On cancellation

If `metadata.completion?.kind === 'cancelled'`:

```text
ooe.job.cancelled
```

### On failure

Inside catch block:

```text
ooe.job.failed
```

### Optional completion event

`ooe.job.completed` may be redundant if result events are enough. Add it only if useful.

---

## 12. Relationship to diagnostics-buffer

The existing diagnostics buffer is valuable and should not be deleted or replaced.

Difference:

### Diagnostics buffer

- terminal/runtime record summary
- newest-first records
- inspector rows
- output summaries
- provenance snapshots
- useful for dev panel

### OOE Event Outbox

- chronological event facts
- lifecycle stream
- useful for trace console, replay, and future bus/surface filtering

They can coexist.

Potential future connection:

- Diagnostics panel can show both terminal records and event timeline.
- Event outbox can feed a trace console.
- Diagnostics records can remain the higher-level summarized view.

For `OOE-EVENT-OUTBOX0`, keep integration minimal.

---

## 13. Tests for OOE Event Outbox

Add tests covering:

- records events in chronological order
- sequence increases monotonically
- bounded buffer evicts oldest events
- subscriber receives events
- unsubscribe works
- clear resets buffer
- event snapshots are immutable enough for tests
- required envelope fields are always present
- payloads remain shallow-serializable

Also update boundary validator tests if new files require allowlisting.

Suggested test file:

```text
src/lib/ooe/events/event-outbox.test.ts
```

---

## 14. Supercarrier updated definition

Supercarrier is bigger than fault tolerance.

Updated definition:

> Supercarrier Architecture is Calcwiz's maintainability, control, contributor-safety, diagnostics, extension, and compartment contract system. Its purpose is to make the app organized, fault-contained, easy to reason about, and eventually modular. Execution flows through OOE, reporting flows through the bus/outbox, and features live inside declared compartments with ownership, dependency rules, diagnostics labels, tests, and fallback behavior.

Supercarrier is about:

- organization
- maintainability
- control
- contributor-safe extension
- logic-error localization
- fault isolation
- easier debugging
- future modularity
- future module/distro readiness
- making almost nothing important happen randomly

It is not just about preventing crashes.

---

## 15. Why Supercarrier should not start before OOE Event Outbox

The repo already has district/facade organization, but not yet a consistent event/fact stream.

If Supercarrier starts before the OOE event outbox:

- compartments may invent their own reporting paths
- diagnostics will fragment
- compartment failure events will not align with OOE job events
- future Surface Protocol will have no clean source of versioned internal facts
- AppMain/runtime hooks may accumulate more ad-hoc status wiring

So order matters:

```text
OOE Event Outbox first.
Supercarrier compartment contracts second.
```

But again: only the minimal OOE-owned outbox first, not a broad app bus.

---

## 16. Supercarrier should formalize current districts, not replace them

The latest repo already has many district/facade boundaries.

Supercarrier should not undo that.

Instead, it should formalize the existing shape into compartment contracts.

Possible first compartments based on current repo:

```text
app-shell
app-runtime
OOE
Display
Calculate
Equation
Calculus
Trigonometry
Geometry
Statistics
LinearAlgebra
Table
Algebra
SymbolicEngine
Engine
VariablesHistory
Guide
Labs
Playground
SourceMirrors
```

This list should be audited before adoption.

Do not create a huge registry in the first event-outbox milestone.

The first Supercarrier milestone should be a separate future milestone such as:

```text
COMPARTMENTS0: Supercarrier compartment contract spec
```

---

## 17. Future Supercarrier contract fields

When `COMPARTMENTS0` happens, each compartment should eventually declare:

```text
id
title
purpose
owned paths
public/internal entrypoints
allowed dependencies
forbidden dependencies
OOE usage
bus/event usage
diagnostics label
failure boundary
fallback behavior
test/golden coverage
future surface exposure candidate: none | internalOnly | candidate
```

Do not implement all of this during `OOE-EVENT-OUTBOX0`.

This is future Supercarrier scope.

---

## 18. Modularity: viable, but phased

Supercarrier should make the app feel modular over time, but the phases matter.

### Phase 1: internal modular monolith

This is already happening through districts/facades and AppMain/runtime/display splits.

Goal:

- clear ownership
- import boundaries
- tests
- diagnostics labels
- fewer monoliths
- easier navigation

This phase is viable now.

### Phase 2: contributor-safe compartments

Future contributors should be able to add or extend a compartment without touching the whole app.

Example:

```text
Add Graphing compartment
→ declare owned paths
→ declare OOE capabilities it may request
→ declare event facts it may publish
→ declare display surfaces it may use
→ add tests/golden cases
→ add fallback behavior
```

This is viable after `COMPARTMENTS0/1`.

### Phase 3: first-party module/profile packs

Later:

- education pack
- engineering pack
- research pack
- graphing pack
- advanced calculus pack

This needs versioning and compatibility rules.

### Phase 4: third-party plugin ecosystem

Possible much later, but not now.

It requires:

- stable APIs
- sandboxing
- permissions
- version compatibility
- broken plugin handling
- trust/signing rules

Do not start here.

---

## 19. Surface Protocol explained clearly as future context

Surface Protocol is a future external contract layer.

It is not implemented now.

It is not OOE.

It is not the internal bus.

It is not Supercarrier.

It is not a plugin system.

Purpose:

> Let other apps, schools, textbook pages, dashboards, or developer tools safely embed or communicate with Calcwiz/REZANOVA through versioned mount configs, events, and read-only queries.

Future components:

### Mount contract

A typed versioned config object passed by a host app.

Possible fields:

```text
workspace
profile
language
theme
branding
allowed capabilities
allowed events
allowed queries
```

### Public event stream

A filtered/stable version of selected internal events.

Internal event:

```text
ooe.result.committed
```

Future public event:

```text
surface.result.committed
```

The public event must be smaller, stable, versioned, and safe.

### Query interface

Read-only access to stable exposed state:

```text
getCurrentResult()
getActiveWorkspace()
getVariables()
getSurfaceCapabilities()
```

Critical rule:

> Do not expose raw OOE events or internal objects directly through Surface Protocol.

For this handoff and next milestone, Surface Protocol is context only.

---

## 20. Do not let Codex invent missing systems

Before implementation, inspect the repo and work only with systems that exist or are explicitly in scope.

Do not create:

- Surface Protocol
- Supercarrier compartments
- full app-wide bus
- plugin system
- public SDK
- remote compute protocol
- Progressive Solver
- LMS/school integration
- global reducer
- generic runtime framework

unless a milestone explicitly asks for it.

For the next milestone, the only new architecture should be:

```text
minimal OOE-owned event outbox
```

and only if explicitly approved.

---

## 21. Recommended updated sequence

Recommended architecture sequence from the latest repo state:

```text
1. OOE-HOST-TEST-FIX1
   Fix stale Rust host count test; preserve host/plan descriptor invariants.

2. OOE-EVENT-OUTBOX0
   Add minimal OOE-owned lifecycle event outbox under an OOE events district.

3. OOE-DIAGNOSTICS-EVENTS1
   Optionally let the dev OOE diagnostics panel inspect recent event timeline.

4. COMPARTMENTS0
   Document Supercarrier compartment contract spec over existing districts.

5. COMPARTMENTS1
   Add lightweight compartment registry/validator only after the spec is stable.

6. COMPARTMENTS2
   Add React error boundaries and compartment failure/recovery event facts.

7. SURFACE0
   Future spec-only Surface Protocol milestone.

8. SURFACE1
   Future tiny read-only embedding proof after OOE, events, and compartments are mature.
```

---

## 22. Acceptance criteria for `OOE-EVENT-OUTBOX0`

A correct implementation should:

- add a small OOE event outbox district or diagnostics-adjacent file
- keep OOE authority intact
- emit only OOE-owned facts
- use typed event names
- use bounded in-memory retention
- include unit tests
- update OOE boundary validator allowlist
- update OOE architecture docs to mention the events district
- not change solver behavior
- not change display behavior
- not change history schema
- not change Surface Protocol
- not add Supercarrier
- not add public API
- not show normal users a new debug surface

---

## 23. Suggested verification

Run at minimum:

```bash
npm run test:ooe-boundaries
npm run test:file-sizes
npm run test:unit -- src/lib/ooe/events/event-outbox.test.ts src/lib/ooe/runtime-control/runtime-coordinator.test.ts
npm run lint
npm run build
```

If environment supports it:

```bash
cargo test --manifest-path src-tauri/Cargo.toml ooe
cargo check --manifest-path src-tauri/Cargo.toml
npm run test:gate
```

Manual smoke:

1. Launch app in dev.
2. Run Calculate.
3. Run Equation.
4. Run Table or another worker-backed workspace.
5. Trigger stale drop by changing input quickly.
6. Trigger cancellation where currently supported.
7. Confirm visible behavior is unchanged.
8. Confirm OOE event outbox records facts in order.
9. Confirm existing diagnostics panel still works.
10. Confirm no normal-user event bus/debug UI appears.

---

## 24. Final updated architecture statement

The updated repo is already moving toward compartmental organization through districts, facades, runtime hooks, and display decomposition.

Do not fight that.

The next safe step is not a broad new framework.

The next safe step is:

```text
OOE-owned event facts first.
Supercarrier compartment contracts later.
Surface Protocol much later.
```

Permanent boundary:

```text
OOE = authority.
OOE Event Outbox = OOE-owned facts.
Bus = later internal message delivery layer, seeded by OOE events.
Supercarrier = maintainability/control/fault/extension compartments.
Surface Protocol = future external embedding/integration contract.
```
