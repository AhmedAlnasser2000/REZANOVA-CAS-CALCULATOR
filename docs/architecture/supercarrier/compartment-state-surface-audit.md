# Compartment State Surface Audit

Status: `COMPARTMENTS-STATE-SURFACE-AUDIT0` docs-only audit

Purpose: define the next Supercarrier-facing state surface before any implementation. The goal is to make compartment activity and failures inspectable without creating a command bus, runtime registry, Surface Protocol, plugin system, or second execution authority.

## Boundary Statement

Calcwiz already has the first reporter:

```text
OOE decides runtime lifecycle.
OOE event outbox reports OOE lifecycle facts.
OOE diagnostics records terminal runtime evidence.
Supercarrier defines compartment ownership and boundaries.
```

The missing piece is a read-only state projection that summarizes known facts per compartment. It should answer what each compartment is doing, what last happened, what went wrong, and where to inspect the evidence.

The state surface must remain derived. It must not own execution truth, mutate jobs, select hosts, cancel work, commit results, retry jobs, rewrite imports, or expose a public integration API.

## Current Inputs

The current repo already exposes enough internal facts for a first projection:

- `src/lib/ooe/events/event-outbox.ts`: chronological OOE lifecycle facts with optional `compartmentId` and `compartmentLabel`.
- `src/lib/ooe/diagnostics/diagnostics-buffer.ts`: terminal diagnostics records with commit assessment, host evidence, trace events, provenance, and error messages.
- `src/lib/ooe/job-launch/active-job-registry.ts`: active and recent job records, cancellation requests, terminal status, and commit assessment.
- `src/lib/ooe/diagnostics/diagnostics-inspector.ts`: existing panel-facing merge of records, jobs, and lifecycle events.
- `tools/compartment-boundaries-core.mjs`: static import-boundary validation for the first Supercarrier enforcement rules.

These inputs are enough for OOE-backed compartment health. They are not enough for full UI/component health yet because no compartment-scoped React error boundary facts exist.

## Proposed State Model

A future projection should produce one summary per known compartment:

```ts
type CompartmentHealth = 'idle' | 'active' | 'warning' | 'failed' | 'unknown';

type CompartmentStateSummary = {
  compartmentId: string;
  compartmentLabel: string;
  health: CompartmentHealth;
  activeJobCount: number;
  recentJobCount: number;
  latestEvent?: {
    type: string;
    sequence: number;
    timestamp: number;
    routeLabel?: string;
    capabilityId?: string;
    hostId?: string;
    message?: string;
  };
  latestIssue?: {
    severity: 'warning' | 'error';
    source: 'ooe-event' | 'diagnostics-record' | 'job-registry' | 'validator-report' | 'ui-boundary';
    summary: string;
    timestamp?: number;
    routeLabel?: string;
    capabilityId?: string;
    hostId?: string;
    evidenceId?: string;
  };
  inspectTarget?: {
    panel: 'records' | 'events' | 'jobs' | 'compartments';
    id?: string;
  };
};
```

This shape is illustrative, not an implementation contract. A later code milestone should refine the exact fields against tests and UI needs.

## Health Rules

Initial health should be conservative:

- `failed`: latest relevant terminal fact is a runtime failure, diagnostics failure, or future UI boundary crash.
- `warning`: latest notable fact is preflight failed, stale dropped, skipped, cancelled, host unavailable, or future validator violation.
- `active`: at least one active job exists and no newer failure/warning dominates it.
- `idle`: known compartment has no active work and latest state is normal or absent.
- `unknown`: known compartment has no mapped facts and no static declaration enough to classify it.

Do not treat every non-commit as a hard error. `staleDropped`, `skipped`, and `cancelled` are notable warnings unless paired with an actual runtime failure.

## Error And Evidence Sources

The projection should show errors by linking back to existing evidence rather than copying full records into a new store:

- `ooe.job.failed`: runtime failure summary from the event and diagnostics record.
- `ooe.preflight.failed`: host/preflight warning with route, capability, and host evidence when available.
- diagnostics terminal `failed`: canonical terminal record for error message, trace, commit assessment, and provenance.
- recent job `failed` or `cancelled`: job-registry status and cancellation details.
- future validator report: static boundary violation for a compartment.
- future UI boundary record: component crash or contained rendering failure.

The first implementation should use OOE events, diagnostics records, and jobs only. Validator and UI-boundary health should remain documented future inputs until those facts have stable producers.

## Relationship To Existing Surfaces

The projection should not replace the current diagnostics panel tabs:

- `Records`: detailed terminal diagnostics records.
- `Events`: chronological lifecycle facts and compartment filter.
- `Jobs`: active/recent job state.
- future `Compartments`: summarized health by compartment with links back to Records, Events, or Jobs.

The projection should reuse the OOE-owned compartment label resolver instead of inventing a second naming table. If a fact is unlabeled, it should stay unlabeled rather than guessing ownership.

## Exclusions

The state surface must not include:

- command dispatch or request submission;
- host selection or retry policy;
- cancellation authority;
- commit legality or stale-drop decisions;
- raw React props, DOM nodes, component instances, solver objects, worker objects, or full Display outcomes;
- giant LaTeX, table row arrays, source mirror paths, playground object data, local filesystem paths, or private environment data;
- a public Surface Protocol shape.

## Future Milestones

Recommended sequence:

1. `COMPARTMENTS-STATE-PROJECTION1`
   - Build an internal read-only projection from OOE events, diagnostics records, and active/recent jobs.
   - Add focused tests for health classification and latest issue selection.
   - Add a developer-only `Compartments` tab or section in the OOE diagnostics panel.

2. `COMPARTMENTS-MANIFEST1`
   - Introduce a small machine-readable compartment catalog only if docs, event labels, diagnostics, and validator rules start drifting.
   - Keep it static and build-time/read-only. Do not make it a runtime registry.

3. `COMPARTMENTS-ERROR-BOUNDARIES1`
   - Add app-shell/component error-boundary facts for compartment-local UI failures.
   - Feed those facts into the projection after the error record shape is stable.

4. Future bus work, only if needed
   - Broaden from OOE event outbox to a more general internal reporting path only after there are multiple approved producers and consumers.
   - Keep it reporting-only unless a separate explicit architecture decision grants command authority.

## High-Risk Contracts

- OOE remains the execution authority. Projection code must not influence host selection, cancellation, stale drops, commit decisions, or route ownership.
- Diagnostics wording and terminal records remain owned by OOE diagnostics.
- Event payloads remain small and serializable.
- Compartment labels remain descriptive metadata.
- Unknown facts remain unknown; do not assign fallback ownership just to fill the UI.
- Static validator reports and runtime health should stay separate until an explicit projection implementation merges them.

## Test Gates For Future Implementation

A future implementation should run:

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/ooe/events/event-outbox.test.ts src/lib/ooe/diagnostics/*.test.ts src/lib/ooe/runtime-control/*.test.ts`
- focused projection tests for health classification and issue ordering
- `npm run test:ui -- src/components/OoeDiagnosticsPanel.ui.test.tsx`
- `npm run test:compartments-boundaries`
- `npm run test:ooe-boundaries`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

Stop and re-plan if the work requires:

- a command bus, app-wide event bus, runtime registry, plugin API, SDK, Surface Protocol, or external embedding API;
- changing OOE event types, event payload semantics, diagnostics record shape, job registry semantics, host ids, capability ids, schemas, or worker-host behavior;
- changing solver behavior, Display readback policy, replay/history contracts, Tauri commands, CSS layout, or reserved-symbol behavior;
- making Supercarrier decide or react to events as a runtime brain;
- assigning guessed compartment ownership to unknown/test events.
