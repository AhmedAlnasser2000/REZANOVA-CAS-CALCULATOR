# OOE Event Outbox And Supercarrier Handoff

Status: durable planning summary from the latest repo-grounded review

Verbatim source handoff: `supercarrier_bus_surface_protocol_handoff_updated_from_repo.md`

Purpose: preserve the current decision record for the OOE event outbox, Supercarrier sequencing, and future Surface Protocol boundary without treating the handoff as already-implemented architecture.

## Current Repo Reality

- OOE is grouped into districts: `bridge-schema/`, `job-launch/`, `runtime-control/`, `diagnostics/`, and `pilots/`.
- OOE uses direct district imports with no root compatibility stubs.
- App runtime hooks, DisplayPanel, Modes, Engine, Symbolic Engine, Algebra, Equation, Calculus, and Display have been decomposed into smaller districts or facades.
- Any bus, Supercarrier, or Surface Protocol work must land as explicit milestones, not as incidental cleanup inside AppMain, Display, Modes, or OOE refactors.

## Permanent Boundary

OOE means Order Of Execution. It remains the execution authority and runtime traffic controller.

OOE owns or coordinates job identity, input revision identity, active/recent lifecycle, cancellation state, stale result and commit assessment, launch-ticket behavior, runtime host metadata, worker/fallback evidence, runtime envelopes, provenance, trace events, diagnostics records, and runtime shell execution wrappers.

OOE is not a solver, renderer, React UI layer, general app event bus, Surface Protocol implementation, plugin system, Supercarrier compartment system, Progressive Solver, or remote-compute protocol.

The standing rule is:

```text
OOE decides.
Event outbox reports.
Supercarrier contains and organizes.
Surface Protocol exposes externally later.
```

## Event Outbox Direction

The source handoff used `OOE-EVENT-OUTBOX0` for the first bus-like milestone. Under Calcwiz milestone convention, the implementation milestone is named `OOE-EVENT-OUTBOX1`; `0` remains reserved for docs/audit-only milestones.

Implementation record: `ooe-event-outbox-district.md`

The outbox is an OOE-owned, in-memory, typed lifecycle fact stream. Requests still go to OOE; facts come out of OOE after OOE has made decisions.

The outbox must not run solvers, commit results, cancel jobs, choose hosts, decide stale drops, replace runtime-control, add a reducer, add a command bus, add Surface Protocol, add Supercarrier, add a plugin API, add an SDK, or expose normal-user UI.

Preferred location:

```text
src/lib/ooe/events/event-outbox.ts
src/lib/ooe/events/event-outbox.test.ts
```

The outbox is separate from `diagnostics/` because diagnostics records are summarized terminal/runtime records, while events are chronological lifecycle facts.

## First Event Scope

Start with lifecycle facts that `runtime-control/runtime-coordinator.ts` can emit accurately:

- `ooe.job.started`
- `ooe.host.selected`
- `ooe.preflight.completed`
- `ooe.preflight.failed`
- `ooe.result.committed`
- `ooe.result.staleDropped`
- `ooe.result.skipped`
- `ooe.job.cancelled`
- `ooe.job.failed`
- `ooe.job.completed` only if useful after the terminal result fact

Do not start with command-like events such as `run.job`, `cancel.job`, `commit.result`, or `execute.solver`.

Do not emit checkpoint/yield events until a later milestone explicitly chooses the extra noise.

## Event Envelope Guardrails

Events should be versioned, bounded, serializable, and small. Useful fields include event id, sequence, type, version, timestamp, source, job id, registry id, input revision id, plan id, capability id, host id, node id, phase id, workspace id, route label, severity, message, and a shallow payload.

Events must not include React objects, DOM nodes, solver instances, full result trees, huge exact LaTeX, table row arrays, source mirror paths, playground objects, private environment data, or local filesystem paths.

## Diagnostics Relationship

The existing diagnostics buffer remains valuable and should not be replaced.

- Diagnostics buffer: summarized terminal runtime records, newest-first records, inspector rows, provenance snapshots, and developer panel details.
- Event outbox: chronological lifecycle facts for future trace timelines, replay analysis, diagnostics timelines, Supercarrier failure reporting, and later Surface Protocol filtering.

`OOE-DIAGNOSTICS-EVENTS1` may let the developer-only OOE diagnostics panel show a compact event timeline, but it must not create normal-user UI.

## Supercarrier Sequencing

Supercarrier should not start before the OOE event outbox. Without a consistent fact stream, compartments may invent their own reporting paths and diagnostics will fragment.

Recommended sequence:

1. `OOE-HOST-TEST-FIX1`: fix stale Rust host descriptor assertions.
2. `OOE-EVENT-OUTBOX1`: add minimal OOE-owned lifecycle event outbox.
3. `OOE-DIAGNOSTICS-EVENTS1`: optionally expose the recent event timeline in developer diagnostics.
4. `COMPARTMENTS0`: document Supercarrier compartment contracts over existing districts.
5. `COMPARTMENTS1`: add a lightweight registry/validator only after the spec is stable.
6. `COMPARTMENTS2`: add compartment failure/recovery events and UI boundaries if still justified.
7. `SURFACE0`: future Surface Protocol spec-only milestone.
8. `SURFACE1`: future tiny read-only embedding proof.

## Future Supercarrier Boundary

Supercarrier is Calcwiz's maintainability, control, contributor-safety, diagnostics, extension, and compartment contract system. It is about organization, ownership, fault localization, diagnostics, and future modularity, not just crash containment.

The first Supercarrier milestone should formalize current districts rather than replace them. Candidate compartments include app-shell, app-runtime, OOE, Display, Calculate, Equation, Calculus, Trigonometry, Geometry, Statistics, LinearAlgebra, Table, Algebra, SymbolicEngine, Engine, VariablesHistory, Guide, Labs, Playground, and SourceMirrors.

Do not build a large registry during `OOE-EVENT-OUTBOX1`.

## Future Surface Protocol Boundary

Surface Protocol is a future external contract layer. It is not OOE, not the internal event outbox, not Supercarrier, and not a plugin system.

Its eventual purpose is to let host apps or developer tools safely embed or communicate with Calcwiz through versioned mount configs, filtered events, and read-only queries.

Do not expose raw OOE events or internal objects directly through Surface Protocol.
