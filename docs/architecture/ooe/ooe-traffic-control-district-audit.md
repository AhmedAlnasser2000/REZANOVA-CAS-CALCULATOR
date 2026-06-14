# OOE Traffic Control District Audit

Status: audit with staged split records

Purpose: map the remaining `src/lib/ooe/` traffic-control core after pilot grouping. OOE traffic control owns job identity, launch legality, active/recent runtime state, stale/cancel/drop decisions, runtime envelopes, trace evidence, bridge schemas, and diagnostics adjacency. It does not own solver math, workspace request construction, Display render policy, duplicate-launch behavior changes, or Tauri/Rust registry implementation in this milestone.

## Current Public Surface

- Bridge/schema: `bridge-schema/ooe-bridge.ts` defines plan descriptors, schema validation, built-in plan lookup, desktop bridge fallback, commit-assessment contracts, and trace schemas.
- Job identity and launch state: `job-launch/job-contract.ts`, `job-launch/active-job-registry.ts`, and `job-launch/launch-tickets.ts` define input revision ids, job contexts, active/recent records, cancellation requests, ticket reservations, and commit legality.
- Runtime coordination: `runtime-control/runtime-coordinator.ts`, `runtime-control/runtime-envelope.ts`, `runtime-control/runtime-shell-contract.ts`, `runtime-control/host-adapter.ts`, and `runtime-control/trace.ts` define runtime execution wrappers, preflight status, runtime metadata, shell evidence, host adapter status, cooperative checkpoints, and trace event assembly.
- Diagnostics adjacency: `diagnostics/diagnostics-buffer.ts` and `diagnostics/diagnostics-inspector.ts` summarize runtime outputs, preserve provenance, and expose diagnostics panel snapshots.
- Pilot adapters now live under `src/lib/ooe/pilots/` and consume this core; they are not part of the traffic-control district split candidate.

## Responsibility Map

- Job/context construction: stable `capabilityId + inputRevisionId` identities, route snapshots, active job records, recent job retention, and ticket-to-history handoff.
- Commit and cancellation policy: latest-only assessment, explicit cancellation requests, stale drop/skipped commit state, and runtime control checkpoints.
- Runtime evidence: preflight status, host evidence, fallback evidence, runtime shell metadata, trace event phases, and final outcome records.
- Diagnostics bridge: mode/workspace provenance, runtime host summaries, input/output summaries, commit decision visibility, and inspector detail lines.

## Current Consumers

- App runtime hooks and `launchWorkspaceRuntimeJob` call job-launch helpers for visible workspace runs.
- `AppMain`, editor runtime control, diagnostics panel, history panel, and mode action handlers read active/recent jobs, diagnostics, and tickets.
- Modes, worker clients, and grouped pilots depend on the runtime-control district for runtime coordinator, runtime envelopes, runtime shell evidence, and host ids.
- Rust/Tauri OOE registry and validation remain adjacent parity surfaces; these traffic-control splits do not edit them.

## Future Split Candidates

- `OOE-JOB-LAUNCH-DISTRICT-SPLIT1`: completed. Job identity, active/recent lifecycle, cancellation records, and history launch tickets now live under `src/lib/ooe/job-launch/`.
- `OOE-RUNTIME-COORDINATOR-DISTRICT-SPLIT1`: completed. Runtime job execution, envelopes, host adapter evidence, shell contracts, and trace helpers now live under `src/lib/ooe/runtime-control/`.
- `OOE-DIAGNOSTICS-DISTRICT-AUDIT0`: completed. Diagnostics buffer, inspector, panel consumers, retention policy, runtime-shell evidence display, and worker diagnostics adjacency are mapped in `ooe-diagnostics-district-audit.md`.
- `OOE-DIAGNOSTICS-DISTRICT-SPLIT1`: completed. Diagnostics records, output summaries, inspector rows, evidence lines, and panel-facing serialization now live under `src/lib/ooe/diagnostics/`.
- `OOE-BRIDGE-SCHEMA-DISTRICT-SPLIT1`: completed. OOE bridge schemas, descriptor access, desktop fallback, commit assessment contracts, job identity schema, and trace schemas now live under `src/lib/ooe/bridge-schema/`.
- `OOE-HOST-TEST-FIX1`: completed. Rust command helper tests now assert the exact current built-in host id set instead of a stale descriptor count.
- `OOE-DUPLICATE-LAUNCH-POLICY1`: behavior milestone for reused/ignored/replaced launch decisions; keep it separate from structure-only district work.

## High-Risk Contracts

- Preserve host ids, fallback host ids, capability ids, plan ids, node ids, phase ids, trace phase ids, runtime shell evidence shape, and diagnostics wording.
- Preserve current stale-gate and cancellation semantics; do not weaken latest-only commit assessment during structure cleanup.
- Preserve active/recent job retention behavior and pending history ticket lifecycle.
- Preserve Display ownership of committed-result rendering policy and Modes/workspace ownership of request construction.
- Preserve TypeScript/Rust descriptor parity; do not introduce duplicate host-id registries that can drift.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/ooe/*.test.ts src/lib/ooe/pilots/*.test.ts`
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/app/logic/editorRuntimeControl.test.ts`
- `npm run test:ui -- src/components/OoeDiagnosticsPanel.ui.test.tsx`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move traffic-control code or tests during this audit.
- Do not introduce an event bus, Surface Protocol, Supercarrier implementation, SDK, plugin API, remote-compute protocol, broad app-wide event system, or generic runtime framework.
- Do not change solver behavior, display/readback policy, runtime host behavior, cancellation semantics, stale-gate behavior, duplicate-launch behavior, diagnostics wording, schemas, capabilities, worker-host identity, replay/history contracts, Tauri/Rust registry behavior, or reserved-symbol policy.

## Split Records

### OOE-JOB-LAUNCH-DISTRICT-SPLIT1

- Created `src/lib/ooe/job-launch/`.
- Moved job contract, active job registry, launch ticket helpers, and direct tests into the district.
- Updated app runtime, mode, editor, diagnostics, and OOE runtime imports directly without root compatibility stubs.
- Preserved job identity, input revision hashing, commit legality, active/recent retention, cancellation records, and pending history ticket behavior.

### OOE-RUNTIME-COORDINATOR-DISTRICT-SPLIT1

- Created `src/lib/ooe/runtime-control/`.
- Moved runtime coordinator, runtime envelope, runtime shell contract, host adapter, trace helpers, and direct tests into the district.
- Updated pilots, mode worker clients, editor analysis, diagnostics buffer, and mode tests to import the new direct paths.
- Preserved runtime envelope shape, shell evidence, host adapter evidence, stale gates, cancellation checkpoints, trace wording, and pilot execution flow.

### OOE-DIAGNOSTICS-DISTRICT-SPLIT1

- Created `src/lib/ooe/diagnostics/`.
- Moved diagnostics buffer, diagnostics inspector, and direct tests into the district.
- Updated diagnostics panel, pilots, runtime-control, mode action handlers, worker runtime tests, and diagnostics UI tests to import the new direct paths.
- Preserved diagnostics wording, row ordering, retention behavior, host evidence rendering, and panel-facing data shape.

### OOE-BRIDGE-SCHEMA-DISTRICT-SPLIT1

- Created `src/lib/ooe/bridge-schema/`.
- Moved OOE bridge schemas and direct tests into the district.
- Updated job-launch, runtime-control, diagnostics, pilots, mode workers, docs, and diagnostics UI tests to import the new direct path.
- Preserved schema names, capability ids, host ids, fallback ids, plan ids, node ids, phase ids, provenance, bridge event shape, and Rust/Tauri parity assumptions.

### OOE-BOUNDARY-FIX1

- Removed the Equation pilot's direct import of `src/lib/equation/complex-input-policy.ts`.
- Moved explicit imaginary-input evidence into Modes/Equation OOE route snapshots.
- Kept OOE pilots consuming route metadata, preserving the boundary that Modes/workspaces own request construction and Equation-specific input policy.
- Preserved the OOE boundary validator unchanged.

### OOE-HOST-TEST-FIX1

- Replaced the stale Rust command helper host-count assertion with exact current host-id set coverage.
- Covered the main-thread and worker host pairs for Calculate, Equation, Calculus, Table, Trigonometry, Statistics, Geometry, and Linear Algebra, plus editor analysis, expression, and direct-symbolic helper hosts.
- Preserved descriptor-driven OOE policy; no worker-host policy list or runtime behavior changed.
