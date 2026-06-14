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

## Verification

- `src/lib/ooe/events/event-outbox.test.ts`
- `src/lib/ooe/runtime-control/runtime-coordinator.test.ts`
- `npm run test:ooe-boundaries`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
