# OOE Rust-First Roadmap

status: active architecture roadmap
created: 2026-05-24
source_context: OOE handoff evaluation against current Calcwiz codebase
related_roadmaps:
- `.memory/research/roadmaps/variable-values-and-substitution-roadmap.md`
- `.memory/research/roadmaps/multivariable-variable-policy-roadmap.md`
- `.memory/research/roadmaps/incubation-infrastructure-roadmap.md`
primary_agent: codex
primary_agent_model: gpt-5.5
attribution_basis: mixed

## Purpose

OOE means Order Of Execution: the durable traffic-control contract for how Calcwiz capabilities move through runtime hosts, phases, stages, priorities, budgets, stop policy, cancellability, stale-result policy, stability states, and trace events.

OOE is not a solver. It is not a renderer. It is not a UI controller. It is not the Progressive Solver. It is the execution-order and scheduling spine that makes the current and future runtimes predictable, responsive, auditable, and safer to migrate toward Rust.

## Why This Exists

Calcwiz already has real execution-order machinery, but it is distributed:

- kernel capability and host registries
- runtime profiles and budgets
- runtime stop/advisory policy
- runtime envelopes
- guarded Equation stage ordering and traces
- expression runtime preparation and fallback phases
- Table build behavior
- editor draft, preview, hint, target-discovery, result-render, persistence, and future job work that compete for app responsiveness

The current system works, but stage order and lifecycle order are not yet represented by one canonical plan contract. OOE should provide that contract.

## Locked Principles

- Rust is the canonical OOE schema and validation owner.
- TypeScript may bridge and adapt, but it must not define a competing OOE authority.
- OOE plans must be serializable and versioned.
- OOE IDs crossing Rust/TypeScript boundaries should be string IDs.
- OOE validation must be pure and testable without running math algorithms.
- OOE should reuse existing capability, host, profile, budget, stop-policy, and envelope concepts.
- OOE should eventually define execution priority, main-thread safety, cancellability, stale-result commit policy, diagnostic trace shape, and observability boundaries.
- Current calculator behavior must remain unchanged until a later explicit runtime pilot.
- OOE must not execute source mirrors, import Playground, or depend on `.memory/`.
- Any future MCP/debug bridge must be local-dev, read-only by default, explicitly enabled, and bounded by privacy/redaction rules.
- Progressive and atomic solver ideas are future metadata only until a dedicated Progressive Solver roadmap begins.

## Current Repo Alignment

Existing TypeScript kernel IDs to mirror later:

- `expression.evaluate`
- `expression.simplify`
- `expression.factor`
- `expression.expand`
- `equation.solve`
- `table.build`

Existing host IDs to mirror later:

- `expression-runtime`
- `equation-runtime`
- `table-runtime`

Future traffic-control hosts to model after the first editor/runtime containment lanes:

- `editor-runtime`
- `analysis-runtime`
- `preview-runtime`
- `render-runtime`
- `persistence-runtime`
- future `job-runtime`

Existing guarded Equation stage order to preserve in any later pilot:

1. `numeric-interval`
2. `bounded-polynomial`
3. `algebra-transform`
4. `composition`
5. `direct-trig`
6. `rewrite-trig`
7. `substitution`
8. `direct-symbolic`

## Roadmap Sequence

### `BUNDLE-SPLIT1` - Startup Bundle Analysis And First Code-Split Cuts

Status: implemented pre-OOE.

Type: frontend build/performance only.

Why it happened before OOE:

- The app had a large startup script warning, with the initial app chunk around `3370.44 kB` raw / `893.22 kB` gzip.
- Reducing eager startup work was a nearer responsiveness win than beginning Rust OOE schema work.
- This does not replace OOE. It only removes obvious startup-loaded JavaScript so later OOE work starts from a healthier shell.

Implemented boundary:

- Vite named vendor chunks for React, MathLive, Compute Engine, Tauri API, Zod, and remaining vendor code.
- `npm run build:analyze` and `npm run test:bundle-size`.
- Manifest-based bundle-size report and budgets.
- Lazy non-initial workspaces and side surfaces.
- Dynamic imports for heavier runtime execution modules and exact algebra-transform eligibility.
- Light UI-only split helpers for Equation UI state, Equation target scanning, variable memory store operations, algebra transform labels, and symbolic display normalization.

Measured result:

- eager startup JS: `1519.65 kB` raw / `411.13 kB` gzip
- largest app chunk: `470.44 kB` raw / `114.36 kB` gzip
- Compute Engine remains a named lazy vendor chunk.
- MathLive remains eager because the initial Calculate editor needs the math field immediately.

Non-goals:

- no solver behavior changes
- no result schema changes
- no history schema changes
- no variable-policy changes
- no OOE scheduling, cancellation, trace bridge, MCP bridge, or runtime routing

### `OOE-RS0` - Architecture Capture And Repo Audit

Status: implemented.

Type: readiness/documentation only.

Goal:

- capture OOE purpose, boundary, Rust-first decision, repo execution-order inventory, Progressive Solver boundary, trace/MCP requirements, and first implementation acceptance criteria.

Artifacts:

- `.memory/research/architecture/ooe-rs0-readiness-audit.md`
- `.memory/research/checklists/2026-05/TRACK-OOE-RS0-MANUAL-VERIFICATION-CHECKLIST.md`
- session dossier under `.memory/sessions/2026-05/2026-05-27/2026-05-27__ooe-rs0/`
- roadmap/current-state/decisions/journal updates

Current seam inventory captured:

- kernel capabilities and runtime hosts
- runtime profiles and budgets
- stop/advisory policy and runtime envelopes
- guarded Equation stage order and current replay trace shape
- editor-analysis runtime containment boundary
- BUNDLE-SPLIT1 startup-load boundary
- current Rust entrypoint shape and the future `src-tauri/src/ooe/` module path

Boundaries:

- no Rust OOE module yet
- no Tauri command bridge
- no TypeScript bridge
- no runtime routing or scheduling
- no solver behavior or UI changes
- no MCP server, trace buffer, job cancellation, Progressive Solver, chunk scheduler, checkpoint ledger, source-mirror execution, Playground runner, or remote execution

Verification:

- `npm run test:memory-protocol`
- `npm run lint`

### `OOE-RS1` - Rust OOE Skeleton And Pure Validation

Status: future implementation.

Goal:

- add canonical Rust OOE types and pure plan validation under `src-tauri/src/ooe/`.

Expected scope:

- `OoeCapabilityId`
- `OoeHostId`
- `OoeNodeId`
- `OoePhaseId`
- `OoeTaskClass`
- `OoePriorityClass`
- `OoeCancellationPolicy`
- `OoeCommitPolicy`
- `OoeThreadSafety`
- `OoeResultStability`
- `OoeNode`
- `OoePlan`
- `OoeTraceEvent`
- structured validation errors
- validation for non-empty IDs, unique nodes, existing dependencies, acyclic graph, and terminal result phase

Non-goals:

- no Tauri command bridge
- no TypeScript bridge
- no runtime routing
- no solver changes
- no UI changes
- no progressive execution

Verification:

- `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run test:memory-protocol`
- `npm run lint`

### `OOE-RS2` - Built-In Plan Registry

Status: future implementation.

Goal:

- mirror current kernel capabilities and hosts in Rust built-in plans.

Non-goals:

- no command bridge
- no frontend integration
- no runtime behavior changes

### `OOE-RS3` - Narrow Tauri OOE Commands

Status: future implementation.

Goal:

- expose plan lookup and validation through narrow Tauri commands.

Initial commands:

- `ooe_list_builtin_plans`
- `ooe_get_builtin_plan`
- `ooe_validate_plan`

Non-goals:

- do not route all calculations through async Tauri calls
- do not change UI behavior

### `OOE-RS4` - Thin TypeScript OOE Bridge

Status: future implementation.

Goal:

- add a frontend bridge that calls the Rust OOE commands and mirrors types only for adapter convenience.

Rule:

- Rust remains canonical. TypeScript bridge is not an authority.

### `OOE-RS5` - Guarded Equation Pilot

Status: future runtime pilot.

Goal:

- wrap existing guarded Equation execution with OOE plan/trace validation while preserving stage order and all results.

Non-goals:

- no stage reordering
- no Equation math migration to Rust
- no result wording changes

### `OOE-RS6` - Trace And Stability Model

Status: future runtime diagnostics.

Goal:

- add internal OOE trace/stability metadata such as stable, failed, stale-dropped, cancelled, slow-phase, and provisional-ready vocabulary.
- define a bounded app-wide trace event shape for runtime debugging without exposing noisy traces to normal users.

Non-goals:

- no provisional UI
- no streamed output
- no MCP server yet

### `OOE-RS7` - Expression Route Coverage

Status: future runtime pilot.

Goal:

- wrap current expression actions with OOE plan/stability/trace at coarse lifecycle phases.

### `OOE-RS8` - Table Route Coverage

Status: future runtime pilot.

Goal:

- wrap `table.build` with OOE plan/stability/trace without changing table output.

### `OOE-RS9` - Runtime Envelope Integration

Status: future internal contract.

Goal:

- attach OOE trace/stability metadata internally to runtime outcomes without exposing noisy trace data to normal users.

### `OOE-RS10` - OOE Boundary Validator

Status: future architecture protection.

Goal:

- add tooling that prevents OOE bridge and Rust OOE modules from importing UI, Playground, source mirrors, or `.memory`.

### `OOE-RS11` - Progressive-Readiness Metadata Only

Status: future readiness.

Goal:

- reserve metadata for `atomic`, `progressive-ready`, and `checkpointable-ready` classes while keeping all production capabilities atomic from the user perspective.

Non-goals:

- no chunk scheduler
- no checkpoint ledger
- no streaming
- no resumability
- no cancellation wiring through solvers
- no remote execution

### `OOE-RS12+` - Job/Cancellation And Rust Migration Readiness

Status: later future work.

Goal:

- only after OOE pilots are stable, define job/cancellation seams, stale-result commit policy, and prepare runtime hosts for incremental Rust migration.

## Traffic-Control And Optimization Direction

OOE must eventually own not only execution order but also execution priority, scheduling policy, budget enforcement, stale-result dropping, and main-thread safety.

Canonical work classes:

- `immediate`: editor text input, caret movement, button response.
- `deferred`: variable hints, preview rendering, target discovery, transform eligibility.
- `explicit`: Solve, Evaluate, Table build, guided actions.
- `heavy`: symbolic solving, future Rust jobs, future progressive-ready work.
- `render-limited`: long result cards, branch sets, matrices, and large formulas.
- `background`: autosave, history persistence, diagnostic trace buffering.

Expected traffic-control rules:

- immediate UI work always wins.
- deferred analysis is cancellable and stale-drop safe.
- explicit runtime work must use job identity and commit only if the input revision still matches.
- heavy runtime work should move toward isolated hosts, Rust/Tauri commands, workers, or later progressive runners.
- render work should be capped, deferred, or summarized when output size would threaten responsiveness.

This direction does not make OOE a UI controller. UI asks for work and renders committed outcomes; OOE validates, schedules, traces, and decides whether a result may commit.

## Traceability And Developer Observability Direction

OOE should make app-wide error tracing easy for developers, contributors, and future agents.

Future trace fields should include:

- `traceId`
- `jobId`
- `inputRevision`
- `capabilityId`
- `hostId`
- `phaseId`
- `stageId`
- `priority`
- `budget`
- `startedAt`
- `durationMs`
- `status`
- `stopReason`
- `errorClass`
- `commitDecision`

Future diagnostic milestones:

- `OOE-TRACE1` - app-wide trace event contract plus bounded in-memory trace buffer.
- `OOE-DIAG1` - developer diagnostics/export surface for recent traces, slow phases, active jobs, stale drops, and last errors.
- `OOE-MCP0` - safety study for a local read-only MCP diagnostics bridge.
- `OOE-MCP1` - local-dev-only read-only MCP server for app state summaries, recent OOE traces, last error trace, active jobs, runtime profiles, and diagnostic bundle export.

MCP and diagnostics must stay observability-first:

- disabled in normal release builds by default
- local only unless a later security review approves otherwise
- read-only by default
- no arbitrary solver execution in the first MCP bridge
- redact expressions unless explicit debug mode allows raw math payloads
- no source-mirror, Playground, file-system, or remote execution access through the diagnostics bridge

## Progressive Solver Boundary

Future Progressive Solver work should begin under a separate `PGS*` roadmap only after OOE has stable plans, task classes, trace, and stability metadata.

Possible future sequence:

- `PGS0` - readiness audit
- `PGS1` - job identity and cancellation contract
- `PGS2` - local chunk runner prototype in Playground/incubation
- `PGS3` - checkpoint ledger prototype
- `PGS4` - first production progressive-eligible capability
- `PGS5` - UI progress/provisional result surface
- `PGS6` - Compute Profile integration

This roadmap does not implement PGS.

## Recommended Next Move

When the user is ready, plan `OOE-RS0` as documentation/readiness, then `OOE-RS1` as the first Rust-only validation implementation.

Do not start with runtime routing. Do not start with Progressive Solver.
