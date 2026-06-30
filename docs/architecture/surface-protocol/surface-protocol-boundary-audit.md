# SURFACE0 - Surface Protocol Boundary Audit

Status: docs and memory boundary audit only.

Reviewed source handoff: `/home/ahmed/Downloads/codex-handoff-surface-protocol.md`.

## Purpose

Surface Protocol is the future external embedding and integration contract for REZANOVA CLASSWIZ CALCULATOR. Its job is to let a host, such as a website, learning management system, documentation page, or another app, mount a bounded REZANOVA workspace, observe stable lifecycle/result events, and query committed state without depending on internal React, Order of Execution, solver, diagnostics, or workspace-instance objects.

This audit starts the Surface Protocol track by defining the boundary. It does not implement the protocol.

## Current Repo Reality

- Surface Protocol does not exist yet.
- Current files that contain `surface` in their names are internal UI, workspace state, diagnostics, or presentation seams. They are not the external Surface Protocol and should not be modified for this track.
- Order of Execution is the runtime traffic controller: launches, host selection, cancellation, stale gates, commit/drop legality, diagnostics, runtime envelopes, and history tickets.
- The Order of Execution event outbox reports lifecycle facts after Order of Execution decisions. It is not a command bus, app-wide event framework, Surface Protocol, plugin layer, or external API.
- Supercarrier compartments define ownership boundaries, diagnostics labels, state projection, and contributor safety. They are not an external embedding contract.
- Formula Viewer, Workspace Tabs, Language, Display, Equation, Calculus, Variables, History, and Settings all have internal state surfaces that may later inform Surface Protocol DTOs, but none of them are themselves the external contract.

Standing separation:

```text
Order of Execution decides.
Order of Execution event outbox reports.
Supercarrier contains and organizes.
Surface Protocol exposes stable external summaries later.
```

## What Surface Protocol Is

Surface Protocol should be a versioned firewall between hosts and REZANOVA internals.

It may eventually provide:

- a mount contract: host supplies validated, versioned configuration;
- a read-only event stream: host receives filtered, stable event DTOs derived from existing facts;
- a query interface: host reads committed state through stable DTOs.

The contract layer should adapt to internals. Hosts should not depend on internal event shapes, diagnostics records, solver result objects, React props, DOM nodes, workspace state objects, app-state schemas, local filesystem paths, or source mirror paths.

## What Surface Protocol Is Not

Surface Protocol is not:

- a new solver, renderer, graphing engine, or computation capability;
- a replacement for Order of Execution;
- a new command bus or host-write event system;
- Supercarrier;
- a plugin system;
- an external software development kit;
- a network, remote procedure call, or remote-compute layer;
- a public route into raw diagnostics, source mirrors, local filesystem state, or private environment data;
- a reason to modify internal `surface` files before a concrete adapter milestone.

If a Surface milestone adds math capability, changes result correctness, changes runtime routing, introduces host commands, or makes graphing live, it has left the SURFACE0 boundary.

## Corrected Handoff Scope

The handoff's core idea is valid: Surface Protocol should formalize a stable host contract over existing systems. The implementation details need a narrower first pass:

- Do not include Graphing in the first mount contract. Graphing remains deferred until numerical solving, domain facts, discontinuities, interval/local completeness wording, branch behavior, and locus/set semantics are stable enough to avoid defunct graphing logic.
- Do not include a top-level `algebra` workspace unless a real user-facing Algebra workspace exists. Current Algebra is primarily shared internal capability plus action surfaces.
- Do not expose `profileId` as a grade-level or feature-profile promise until the actual profile system and capability gating contract are audited.
- Do not expose stored-variable seeding as persistent app-memory mutation without a host/session storage policy.
- Do not call the Surface event layer a broad event bus in implementation docs. Preferred wording is `Surface event adapter` or `Surface event stream`, read-only from the host perspective.
- Do not promise full computer algebra system parity. Public contract wording should keep REZANOVA as an advancing, bounded math workbench.

## Candidate First Surface

The first viable contract should be deliberately small.

Candidate workspaces:

- `calculate`: simplest expression/result flow.
- `equation`: useful host surface, but only for exact/current numeric behavior already committed through normal Equation runtime paths.

Deferred from first surface:

- Graphing, until numeric solving and domain/locus semantics are stable.
- Spreadsheet, until it has a product surface.
- Full Settings, History, and Variables pages, until tab/page surfaces exist.
- Calculus, unless a later audit decides derivative/integration result DTOs are stable enough.
- Guide, Labs, Playground, and source mirrors.

## DTO Firewall Rules

Surface DTOs must be small, serializable, versioned, and stable.

Allowed kinds of data:

- protocol version;
- workspace kind;
- stable job id or surface job id;
- committed result summary;
- bounded display summary such as primary LaTeX, approximate value, result kind, and count metadata;
- stable status such as ready, computing, stopped, committed, stale-dropped, or failed;
- user-visible facts already intended for result surfaces, such as conditions, exclusions, warnings, and local interval wording;
- selected non-sensitive settings such as angle unit, if a Surface milestone explicitly includes them.

Forbidden data:

- raw Order of Execution event objects;
- diagnostics records and raw provenance records;
- solver objects, MathJSON trees, Display block trees, React props, DOM nodes, worker objects, or runtime envelopes;
- source mirror paths or copied source;
- local filesystem paths, environment data, package paths, or developer-only diagnostics payloads;
- full large formula trees or table row arrays without an explicit size/cap policy;
- private app-state or persisted storage schemas.

## Mount Contract Boundary

SURFACE0 does not approve a live mount adapter.

Before `SURFACE-MOUNT1`, a follow-up audit or implementation plan must decide:

- first supported workspace set;
- whether mount creates a new workspace instance or attaches to an existing tab;
- whether host seed values are session-only or may write to calculator memory;
- how stored-variable seeding preserves Equation's rule that stored values are not symbolic assumptions;
- whether tabs are visible, hidden, or single-surface only;
- what language and branding options are actually supported;
- how unsupported fields return structured errors without throwing.

Breaking changes must create a new protocol version rather than mutating a shipped version.

## Event Adapter Boundary

The first Surface event adapter should subscribe to the existing Order of Execution event outbox and map only a curated subset into stable Surface events.

Safe first candidates:

- surface ready;
- compute started;
- result committed;
- compute stopped or failed;
- result stale-dropped.

Rules:

- Events are read-only to the host.
- Hosts cannot inject Order of Execution events.
- Internal events that are not part of the stable set are dropped.
- Every event must carry a protocol version.
- Event payloads must use Surface DTOs, not internal objects.

## Query Boundary

The first query interface should be read-only and committed-state-only.

Safe first candidates:

- current committed result summary;
- active workspace kind;
- selected safe settings such as angle unit;
- stored variables only if a privacy/storage policy is explicit.

Rules:

- Queries must not trigger computation.
- Queries must not return partial in-flight results.
- Queries must not read hidden developer diagnostics unless a later developer-only protocol is explicitly approved.
- Query results must be stable DTOs with caps for large result surfaces.

## Graphing Deferral

Graphing is intentionally excluded from the first Surface Protocol contract.

The blocker is not visual ambition. The blocker is correctness. A graphing surface needs trusted inputs: equation/numeric result semantics, local versus global completeness wording, domain exclusions, discontinuities, branches, parameter ranges, Complex locus/set policy, and stable failure reasons. Until numerical solving and locus semantics are stable, graphing would risk becoming a polished view over unstable logic.

Future Graphing should be planned as a scene/runtime surface over validated solver/domain/branch outputs, not as a Surface Protocol proof-case.

## Recommended Sequence

1. `SURFACE0 - Surface Protocol Boundary Audit`
   - This document.
   - No runtime behavior.

2. `SURFACE-DTO-FIREWALL1`
   - Add pure DTO schemas and mappers for one committed result summary and one Order of Execution lifecycle event.
   - No host mount, no query dispatcher, no external API.
   - Tests prove raw internal objects do not pass through.

3. `SURFACE-EVENT-ADAPTER1`
   - Read-only adapter from the Order of Execution event outbox to stable Surface events.
   - No host commands.

4. `SURFACE-QUERY1`
   - Read-only committed-state queries for the first approved workspace set.
   - No computation trigger.

5. `SURFACE-MOUNT1`
   - Validated mount contract only after workspace-instance, storage, language, branding, and capability-gating choices are settled.

6. `SURFACE-HOST-PROOF1`
   - A tiny local host/demo proof, not a plugin system, network layer, graphing surface, or external software development kit.

## Open Questions Before Implementation

- Which first host use case matters most: docs/demo embed, learning management system embed, app-to-app integration, or developer tooling?
- Should first mount be single-workspace only, or should it expose Workspace Tabs?
- Are host-provided stored variables session-only, or can they write through calculator memory?
- What is the first stable result summary shape that is useful without exposing Display internals?
- Should Surface Protocol ever expose History, or should History wait for the richer full History/Records tab surface?
- Which fields, if any, need privacy or user-consent gates before external exposure?

## Stop Rules

Stop the Surface track if a proposed milestone:

- starts Graphing before numeric solving/domain/locus semantics are stable;
- creates a host command bus;
- lets hosts write into Order of Execution through events;
- exposes raw diagnostics, internal events, solver objects, Display blocks, React props, DOM nodes, source mirror paths, local filesystem paths, or environment data;
- implements a plugin system, external software development kit, network protocol, or remote compute layer;
- modifies internal `surface` UI state files just because their names sound related;
- changes solver behavior, result correctness, Display policy, History schemas, app-state schemas, or runtime routing.
