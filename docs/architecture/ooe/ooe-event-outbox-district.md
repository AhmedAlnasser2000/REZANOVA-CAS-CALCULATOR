# OOE Event Outbox District

Status: implemented in `OOE-EVENT-OUTBOX1`

Purpose: define the small OOE-owned event stream that reports lifecycle facts after OOE has made execution decisions. This is not a global app bus, command bus, Surface Protocol, Supercarrier implementation, plugin API, SDK, reducer, or public user-facing API.

## Public Surface

- `src/lib/ooe/events/event-outbox.ts` owns the in-memory event list, bounded retention, event recording, snapshots, latest lookup, clear behavior, and subscriber callbacks.
- The surface is internal to OOE and developer diagnostics. Normal workspaces still submit runtime requests through OOE runtime control, not through the outbox.

## Event Contract

- Events are versioned envelopes with source `ooe`, monotonic sequence numbers, stable event ids, timestamps, event type, severity, optional OOE identity fields, route label, short message, and small shallow-serializable payloads.
- The default retention cap is 300 events. The oldest events are evicted first.
- Snapshots returned by the outbox are cloned so callers and tests cannot mutate stored records.

## Initial Event Types

- `ooe.job.started`
- `ooe.host.selected`
- `ooe.preflight.completed`
- `ooe.preflight.failed`
- `ooe.result.committed`
- `ooe.result.staleDropped`
- `ooe.result.skipped`
- `ooe.job.cancelled`
- `ooe.job.failed`
- `ooe.job.completed`

Checkpoint/yield events are intentionally deferred so the first event stream stays low-noise.

## Runtime Integration

- `runtime-control/runtime-coordinator.ts` emits lifecycle-core facts when it starts jobs, resolves host adapters, completes/fails preflight, reaches terminal commit assessment, records cancellation, or catches runtime failure.
- Emission follows OOE decisions. It does not choose hosts, cancel work, assess commits, commit results, or change diagnostics records.

## Guardrails

- Payloads must remain small and serializable. Do not include React objects, DOM nodes, solver instances, full result trees, giant exact LaTeX, table rows, source mirror paths, playground objects, private environment data, or local filesystem paths.
- Keep diagnostics records separate from events: diagnostics summarize terminal runtime records; the outbox records chronological lifecycle facts.
- Do not expose raw OOE events through a future Surface Protocol. A future public surface must filter and stabilize event data separately.

## Diagnostics Timeline Record

`OOE-DIAGNOSTICS-EVENTS1` renders recent event snapshots in the existing developer-only OOE diagnostics panel. The panel remains a diagnostics surface, not a new route or normal-user UI. Event rows are compact lifecycle facts and do not replace selected diagnostics/job raw-record copy behavior. Panel Clear clears outbox events along with diagnostics and recent jobs while preserving active jobs.

## Outbox Coverage Closure

`OOE-EVENT-OUTBOX2` closes the thin coordinator coverage branch for `ooe.result.skipped`. The coordinator test now drives a real `commitIfCurrent` job with no active revision, verifies the emitted lifecycle sequence, and checks that recent jobs, diagnostics, and event payloads agree on the skipped decision. A small event-type coverage guard also accounts for every declared `OoeEventType` so future lifecycle additions cannot silently miss coordinator coverage.

## Compartment Label Record

`COMPARTMENTS-DIAGNOSTICS-LABELS1` adds optional descriptive compartment metadata to OOE event snapshots:

- `compartmentId`
- `compartmentLabel`

The labels are resolved inside OOE from runtime lifecycle facts such as capability id, route label, and host id. Known mappings cover Calculate, Equation, Calculus, Trigonometry, Statistics, Geometry, Linear Algebra, Table, and Navigation/Input. Unknown or test routes remain unlabeled rather than guessed.

The labels are diagnostics metadata only. They do not affect execution, host routing, cancellation, stale-drop behavior, commit legality, event type semantics, payload semantics, schemas, or Surface Protocol.

## Compartment Filter Record

`COMPARTMENTS-DIAGNOSTICS-FILTER1` adds an event-timeline-only compartment filter to the developer OOE diagnostics panel. The filter uses the OOE-owned compartment option list and applies only to recent lifecycle event rows. Diagnostics records and active/recent job rows continue using the existing status and text query behavior.

Unknown or unlabeled events remain visible under `All` and are not assigned fallback ownership. The filter is a diagnostics usability feature only; it does not affect OOE event emission, retention, routing, cancellation, stale-drop behavior, commit legality, schemas, or Surface Protocol.

## Diagnostics Tabs Record

`COMPARTMENTS-DIAGNOSTICS-TABS1` reorganizes the developer OOE diagnostics panel into `Records`, `Events`, and `Jobs` tabs. `Records` remains the default diagnostics-buffer view, `Events` owns the compartment-filtered lifecycle timeline, and `Jobs` owns active/recent job rows.

The tabs are presentation-only. They do not change OOE event emission, retention, diagnostics storage, job registry state, selected raw-record copy semantics for diagnostics/jobs, runtime routing, cancellation, stale drops, commit legality, schemas, Surface Protocol, bus behavior, or Supercarrier enforcement.

## Compartment State Projection Record

`COMPARTMENTS-STATE-PROJECTION1` uses OOE lifecycle events as one input to a read-only compartment health projection. The projection is owned by OOE diagnostics and also reads terminal diagnostics records plus active/recent jobs. The diagnostics panel now has a fourth developer-only `Compartments` tab that summarizes compartment health and links back to Records, Events, or Jobs evidence.

This does not change the event outbox contract. No event types, event payload semantics, retention behavior, lifecycle emission points, routing, cancellation, stale-drop behavior, commit legality, schemas, Surface Protocol boundaries, bus behavior, or Supercarrier enforcement change in this milestone.

## App Runtime Summary Seam Record

`APP-RUNTIME-OOE-SUMMARY-SEAM1` adds a narrow OOE pilot/provenance helper for app-runtime workspace provenance output summaries. It delegates to the existing diagnostics summarizer and changes only the import boundary: app runtime no longer imports OOE diagnostics internals directly.

The event outbox remains unchanged. No event types, event payloads, lifecycle emission points, diagnostics retention, routing, cancellation, stale-drop behavior, commit legality, schemas, Surface Protocol boundaries, or bus behavior change in this cleanup.

## Verification

- `src/lib/ooe/events/event-outbox.test.ts`
- `src/lib/ooe/runtime-control/runtime-coordinator.test.ts`
- `npm run test:ooe-boundaries`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
