# OOE Root Surface Audit

Status: audit, pilot grouping complete

Purpose: document the current `src/lib/ooe/` root surface before any structural cleanup. OOE is Calcwiz runtime traffic control: it owns launch/job identity, host routing metadata, cancellation, stale-commit assessment, diagnostics, provenance, and runtime envelopes. It does not own solver math or committed-result rendering policy.

## Current Public Surface

- Bridge/schema surface: `ooe-bridge.ts` defines TypeScript OOE schemas, plan validation, descriptor shapes, desktop bridge fallback, and commit-assessment contracts.
- Job and launch surface: `job-contract.ts`, `active-job-registry.ts`, and `launch-tickets.ts` own canonical job/input ids, active/recent jobs, cancellation requests, ticket metadata, and commit legality.
- Runtime surface: `runtime-coordinator.ts`, `runtime-envelope.ts`, `runtime-shell-contract.ts`, `host-adapter.ts`, and `trace.ts` own preflight, host adapter status, runtime envelopes, cooperative checkpoints, shell evidence, and trace event assembly.
- Pilot surface: `pilots/` contains Equation, Calculate, Table, Expression, Workspace, and workspace-specific pilot adapters that bridge mode runtimes to OOE metadata and provenance.
- Diagnostics surface: `diagnostics-buffer.ts` and `diagnostics-inspector.ts` own recent diagnostics records, output summaries, inspector snapshots, and evidence lines.

## Responsibility Map

- Traffic control: start jobs, derive stable job/input revisions, assess latest-only commits, record stale drops/skips, and preserve cancellation status.
- Host policy: describe current TypeScript, worker, and compatibility hosts; preserve worker-primary host ids and fallback evidence without flattening workspace identity.
- Provenance and diagnostics: summarize inputs/outputs, trace stages/checkpoints, preserve runtime host evidence, and expose active/recent job snapshots for diagnostics panels.
- Workspace pilots: provide OOE metadata around existing mode runtimes; they should not absorb solver logic, display render policy, or workspace ownership.

## Ratchet Pressure

- No OOE root file currently exceeds the default cap.
- Pilot files now live under `src/lib/ooe/pilots/`; `equation-pilot.ts` remains the largest pilot production file and is policy-sensitive, not a line-count emergency.
- OOE tests are broad but still below the file-size cap.

## Future Split Candidates

- `OOE-TRAFFIC-CONTROL-DISTRICT-AUDIT0`: audit the remaining traffic-control core after pilot grouping.
- `OOE-DIAGNOSTICS-SURFACE-TIDY1`: consider only if diagnostics buffer/inspector output grows; preserve evidence wording and inspector item shape.
- `OOE-DUPLICATE-LAUNCH-POLICY1`: future behavior milestone for duplicate launch/rerun policy; it should not be bundled with root surface cleanup.
- `OOE-WORKER-HOST-POLICY-AUDIT0`: pair with any Modes worker/client grouping so worker host ids, fallback host ids, Tauri descriptor policy, and runtime shell evidence stay aligned.

## High-Risk Contracts

- Preserve `OOE = runtime traffic control`: launch identity, active revision comparison, cancellation, stale drops, commit decisions, host routing, traces, provenance, diagnostics, and runtime envelopes.
- Preserve host ids, capability ids, plan ids, node ids, phase ids, fallback host ids, worker-primary host metadata, bridge schemas, and validation errors.
- Preserve the boundary that Display owns render policy for committed results; OOE records commit/drop and diagnostics but does not decide progressive rendering.
- Preserve the boundary that Modes/workspaces own request construction and user-facing mode identity; OOE wraps execution and provenance.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move code or tests during this audit.
- Do not introduce an event bus, Surface Protocol, Supercarrier implementation, SDK, plugin API, remote-compute protocol, or broad app-wide event system.
- Do not change solver behavior, display/readback policy, runtime host behavior, cancellation semantics, stale-gate behavior, diagnostics wording, schemas, capabilities, worker-host identity, replay/history contracts, or reserved-symbol policy.

## OOE-PILOT-SURFACE-GROUPING1 Final Record

The pilot grouping milestone moved OOE pilot production files and direct pilot tests into `src/lib/ooe/pilots/` without keeping root compatibility stubs.

Grouped pilot surface:

- `calculate-pilot.ts`, `calculus-pilot.ts`, `equation-pilot.ts`, `expression-pilot.ts`, `geometry-pilot.ts`, `linear-algebra-pilot.ts`, `statistics-pilot.ts`, `table-pilot.ts`, `trigonometry-pilot.ts`, and `workspace-pilot.ts`.
- `equation-pilot.test.ts`, `expression-pilot.test.ts`, `table-pilot.test.ts`, and `workspace-pilot.test.ts`.

Updated consumers:

- Modes, worker clients, app mode-action routing, and architecture docs now import pilot contracts from `src/lib/ooe/pilots/`.
- Core OOE traffic-control modules remain at the root.

Preserved contracts:

- Host ids, fallback ids, capability ids, plan ids, node ids, phase ids, runtime shell evidence, provenance, trace wording, cancellation behavior, stale-gate behavior, diagnostics wording, schemas, replay/history contracts, and workspace/mode ownership were not changed.
