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
- `.memory/research/checklists/2026-05/2026-05-27/TRACK-OOE-RS0-MANUAL-VERIFICATION-CHECKLIST.md`
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

Status: implemented.

Goal:

- add canonical Rust OOE types and pure plan validation under `src-tauri/src/ooe/`.

Implemented scope:

- `OOE_SCHEMA_VERSION = 1`
- `OoePlanId`
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
- structured serde validation errors
- pure validation for non-empty IDs, unique nodes, existing dependencies, acyclic graph, and terminal result phase

Artifacts:

- `src-tauri/src/ooe/mod.rs`
- `src-tauri/src/ooe/types.rs`
- `src-tauri/src/ooe/validation.rs`
- `.memory/research/checklists/2026-05/2026-05-27/TRACK-OOE-RS1-MANUAL-VERIFICATION-CHECKLIST.md`
- session dossier under `.memory/sessions/2026-05/2026-05-27/2026-05-27__ooe-rs1/`

Non-goals:

- no Tauri command bridge
- no TypeScript bridge
- no runtime routing
- no solver changes
- no UI changes
- no progressive execution
- no trace buffer
- no MCP diagnostics bridge
- no cancellation or scheduler implementation

Verification:

- `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run test:memory-protocol`
- `npm run lint`

### `OOE-RS2` - Built-In Plan Registry

Status: implemented.

Goal:

- mirror current kernel capabilities and hosts in Rust built-in plans.

Implemented scope:

- `OoeBuiltinPlanCategory`
- `OoeBuiltinPlanDescriptor`
- `list_builtin_ooe_plan_descriptors`
- `list_builtin_ooe_plans`
- `get_builtin_ooe_plan`
- `validate_builtin_ooe_plans`
- one conservative one-node terminal plan per current kernel capability:
  - `expression.evaluate`
  - `expression.simplify`
  - `expression.factor`
  - `expression.expand`
  - `equation.solve`
  - `table.build`

Artifacts:

- `src-tauri/src/ooe/registry.rs`
- `.memory/research/checklists/2026-05/2026-05-27/TRACK-OOE-RS2-MANUAL-VERIFICATION-CHECKLIST.md`
- session dossier under `.memory/sessions/2026-05/2026-05-27/2026-05-27__ooe-rs2/`

Non-goals:

- no command bridge
- no frontend integration
- no runtime behavior changes
- no scheduler, cancellation, trace buffer, MCP diagnostics bridge, or solver migration

Verification:

- `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run test:memory-protocol`
- `npm run lint`

### `OOE-RS3` - Narrow Tauri OOE Commands

Status: implemented.

Goal:

- expose plan lookup and validation through narrow Tauri commands.

Implemented commands:

- `ooe_list_builtin_plans`
- `ooe_get_builtin_plan`
- `ooe_validate_plan`

Implemented scope:

- `OoeValidationReport`
- command wrappers under `src-tauri/src/ooe/commands.rs`
- command registration through `tauri::generate_handler!`
- invalid plans return `{ ok, errors }` report data
- unknown built-in plan lookup returns `None` / `null`

Non-goals:

- do not route all calculations through async Tauri calls
- do not change UI behavior
- no frontend TypeScript bridge
- no solver execution
- no scheduler, cancellation, trace buffer, MCP diagnostics bridge, or solver migration

Verification:

- `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run test:memory-protocol`
- `npm run lint`

### `OOE-RS4` - Thin TypeScript OOE Bridge

Status: implemented.

Goal:

- add a frontend bridge that calls the Rust OOE commands and mirrors types only for adapter convenience.

Implemented scope:

- TypeScript OOE mirror types and zod schemas for Rust serde wire shapes.
- bridge wrappers for `ooe_list_builtin_plans`, `ooe_get_builtin_plan`, and `ooe_validate_plan`.
- explicit unavailable results for web preview / non-Tauri contexts.
- command response parsing at the bridge boundary.

Rule:

- Rust remains canonical. TypeScript bridge is not an authority.
- no TypeScript OOE registry or validator
- no runtime routing, UI consumer, solver execution, scheduler/cancellation, trace buffer, MCP bridge, history schema, or result schema change

Verification:

- `npm run test:unit -- src/lib/ooe/ooe-bridge.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml ooe`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`

### `OOE-RS5` - Guarded Equation Pilot

Status: implemented.

Goal:

- wrap existing guarded Equation execution with OOE plan/trace validation while preserving stage order and all results.

Implemented scope:

- internal Equation OOE pilot helper that fetches `plan.equation.solve` through the RS4 bridge
- Rust validation report consumption through `validateOoePlan`
- fail-open status values:
  - `ready`
  - `unavailable`
  - `missing-plan`
  - `invalid-plan`
  - `bridge-error`
- traced shared guarded-solve path using `listGuardedEquationStageDescriptors().map(id)` as the exact stage order for `runGuardedEquationSolveWithStageOrder`
- `runEquationModeWithOoePilot(request)` returning `{ outcome, ooePilot }`
- Equation symbolic and Equation numeric-interval runtime-controller actions now use the wrapper and commit only `outcome`

Preserved guarded Equation order:

1. `numeric-interval`
2. `bounded-polynomial`
3. `algebra-transform`
4. `composition`
5. `direct-trig`
6. `rewrite-trig`
7. `substitution`
8. `direct-symbolic`

Non-goals:

- no stage reordering
- no Equation math migration to Rust
- no result wording changes
- no UI trace panel
- no history/result schema changes
- no app-wide trace buffer
- no MCP diagnostics bridge
- no scheduling, cancellation, or stale-result commit control

Verification:

- `npm run test:unit -- src/lib/ooe/equation-pilot.test.ts src/lib/equation/guarded-solve.test.ts src/lib/modes/equation.test.ts src/app/logic/runtimeControllers.test.ts`

### `OOE-RS6` - Trace And Stability Model

Status: implemented.

Goal:

- add internal OOE trace/stability metadata such as stable, failed, stale-dropped, cancelled, slow-phase, and provisional-ready vocabulary.
- define a bounded app-wide trace event shape for runtime debugging without exposing noisy traces to normal users.

Implemented scope:

- Rust canonical trace schema now includes trace/job/stage/input-revision ID newtypes.
- trace statuses cover `planned`, `started`, `completed`, `staleDropped`, `cancelled`, `failed`, `slowPhase`, and `provisionalReady`.
- result stability includes `provisional` alongside `draft`, `stable`, `stale`, and `failed`.
- trace events may carry optional capability, host, stage, input revision, and commit-decision metadata.
- TypeScript OOE bridge mirrors the Rust wire shape with zod parsing only.
- Equation pilot metadata now emits internal trace events for OOE preflight, guarded stage attempts, and final stable outcome.

Non-goals:

- no app-wide trace buffer
- no provisional UI
- no streamed output
- no MCP server yet
- no scheduling, cancellation, stale-result commit control, solver migration, result schema, history schema, or user-facing result changes

### `OOE-RS7` - Expression Route Coverage

Status: implemented.

Goal:

- wrap current expression actions with OOE plan/stability/trace at coarse lifecycle phases.

Implemented scope:

- standard Calculate actions only:
  - `evaluate`
  - `simplify`
  - `factor`
  - `expand`
- fail-open plan lookup and validation through the TypeScript OOE bridge
- internal/test-visible metadata with action, plan, capability, host, status, and trace events
- coarse lifecycle trace events: preflight, started, final stable outcome
- `runCalculateModeWithOoePilot(request)` while preserving the existing synchronous `runCalculateMode(request)` API
- runtime-controller adoption for standard Calculate actions only

Non-goals:

- no calculus workbench route coverage
- no advanced-calculus coverage
- no table coverage
- no algebra-tray explicit-transform coverage
- no UI trace panel
- no result wording, history schema, result schema, stored-value behavior, or planner behavior changes
- no scheduling, cancellation, stale-result commit control, or Rust execution

### `OOE-RS8` - Table Route Coverage

Status: implemented.

Goal:

- wrap `table.build` with OOE plan/stability/trace without changing table output.

Implemented scope:

- active Table runtime hook only
- fail-open plan lookup and validation for `plan.table.build` through the TypeScript OOE bridge
- internal/test-visible metadata with plan, capability, host, status, and trace events
- coarse lifecycle trace events: preflight, started, final stable outcome
- `runTableModeWithOoePilot(request)` while preserving the existing `runTableMode(request)` API
- exact `DisplayOutcome` and `TableResponse` parity with current Table behavior

Non-goals:

- no legacy `modeActionHandlers.ts` Table path changes
- no UI trace panel
- no result wording, history schema, result schema, stored-value/replay/domain/row behavior changes
- no scheduling, cancellation, stale-result commit control, or Rust execution

### `OOE-RS9` - Runtime Envelope Integration

Status: implemented.

Goal:

- attach OOE trace/stability metadata internally to runtime outcomes without exposing noisy trace data to normal users.

Implemented scope:

- shared `OoeRuntimeEnvelope<TPayload, TMetadata>` as `{ payload, ooe }`
- shared runtime metadata fields for plan, capability, host, node, phase, status, and trace events
- shared fail-open plan lookup/validation helper for `ready`, `unavailable`, `missing-plan`, `invalid-plan`, and `bridge-error`
- shared coarse lifecycle trace helpers for preflight, started, and final stable events
- Expression, Equation, and Table pilots migrated to the shared envelope contract
- Equation guarded stage-order and guarded trace metadata preserved as route-specific OOE metadata
- runtime consumers unwrap and commit only payload data

Non-goals:

- no OOE metadata inside `DisplayOutcome`
- no visible UI trace panel
- no app-wide trace buffer
- no history/result schema changes
- no scheduling, cancellation, stale-result commit control, Rust execution, or solver migration

### `OOE-RS10` - OOE Boundary Validator

Status: implemented.

Goal:

- add tooling that prevents OOE bridge and Rust OOE modules from importing UI, Playground, source mirrors, or `.memory`.

Implemented scope:

- `tools/ooe-boundaries-core.mjs`
- `tools/validate-ooe-boundaries.mjs`
- `tools/validate-ooe-boundaries.test.mjs`
- `npm run test:ooe-boundaries`
- `npm run test:gate` now includes the OOE boundary validator.

Protected boundaries:

- Rust OOE production modules may use local OOE modules plus Rust std/serde support only.
- TypeScript OOE core files may use local OOE helpers, the Tauri invoke bridge, zod schemas, and shared calculator types only.
- TypeScript OOE pilot files may use local OOE helpers plus the explicit wrapped runtime seams for Equation, standard expression actions, and active Table builds.
- OOE production files must not import UI, app controllers/hooks, Playground, source mirrors, Labs runner surfaces, tool scripts, `.memory`, or broad solver/runtime layers outside the explicit pilot allowlist.

Non-goals:

- no runtime routing changes
- no scheduler, cancellation, or stale-result commit control
- no trace buffer or MCP endpoint
- no Rust solver execution
- no UI/result/history/schema changes

### `OOE-RS11` - Solver Execution Policy Metadata Only

Status: implemented.

Goal:

- reserve metadata for future solver execution policies without implementing them yet.

Locked vocabulary:

- `classic`: current calculator/CAS-style one-shot user experience. It may run locally or draw compute from at most one external SSH/compute source in future infrastructure, but the user-facing solve still behaves like a single request and final result.
- `progressive`: chunked asynchronous solver execution. It uses a governor to yield to the OS/app so UI remains responsive, avoids expand-first combinatorial blowups through search-first materialization, streams user-relevant output records/strings directly to persistent display/output storage, and can resume from idempotent chunk checkpoints instead of restoring bloated mid-step CPU/RAM state. Future Progressive may use local compute or one external SSH/compute source.
- `atomic`: deferred for now. It uses the same chunked/checkpointable/search-first architecture as Progressive, not a one-shot mode, but differs by resource policy and topology: Atomic pushes available hardware more aggressively and may fan out across multiple external SSH/compute hosts. Because that multi-host/aggressive execution model is harder, do not include Atomic in near-term implementation work.

Near-term active modes:

- only `classic` and `progressive` are active planning targets for now.
- `atomic` remains future-only until Progressive is proven locally and the external/multi-host compute boundary is deliberately reopened.

Implemented metadata axes:

- solver mode: `classic` or `progressive`
- chunking policy: none vs chunked
- checkpoint policy: none vs idempotent ledger readiness
- output streaming policy: final-only vs committed-artifact readiness
- search/materialization policy: full vs search-first readiness
- compute topology: local vs single external source metadata
- resource policy: normal

Current production stance:

- all existing production capabilities remain Classic from the user perspective.
- no existing solver becomes Progressive or Atomic in RS11.
- no Atomic enum/schema value, execution support, multi-host topology, or aggressive resource policy is implemented or exposed in RS11.

Implemented scope:

- Rust OOE node schema owns the Classic/Progressive policy fields and serde defaults.
- Existing built-in plans explicitly use Classic/local/final-only/full-materialization/normal-resource metadata.
- Rust validation rejects Classic nodes with Progressive-only policy combinations and requires Progressive nodes to be chunked.
- TypeScript OOE bridge mirrors the new Rust wire shape through zod only.

Non-goals:

- no chunk scheduler
- no checkpoint ledger
- no streaming
- no resumability
- no cancellation wiring through solvers
- no remote execution
- no TypeScript OOE authority
- no user-visible behavior change
- no Atomic exposure


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

When the user is ready, plan `OOE-RS20` as the next OOE traffic-controller slice: a central runtime coordinator over the existing OOE-covered lanes. Keep it narrow: route existing Calculate, Equation, and Table OOE envelopes through one coordinator without changing visible output, scheduling policy, Progressive Solver behavior, MCP diagnostics, or Rust solver execution.

Do not jump straight to broad scheduling, MCP diagnostics, Progressive Solver, or Rust solver migration until the coordinator owns the existing job lifecycle, active job registry integration, stale-commit assessment, and trace handoff consistently.


## OOE-RS13 - Runtime Job Identity Threading

Status: implemented metadata-only adoption.

What changed:

- Existing Expression, Equation, and Table OOE pilots now include `job` and `commitAssessment` sidecar metadata.
- Job identity is deterministic: route snapshots are canonicalized with stable key ordering and hashed into `job.<capabilityId>.<hash>` and `input.<capabilityId>.<hash>` IDs.
- Current pilots default the active input revision to the job revision, so they record `commitAllowed` / `committed` metadata without enforcing stale-result gating.
- Test-only overrides can record `staleDrop` / `staleDropped` metadata without blocking payload return.
- Pilot trace events now carry job ID and input revision context; final stable events carry the RS12 commit decision.

Boundaries:

- No stale-result enforcement.
- No cancellation or scheduler.
- No UI trace panel or diagnostics surface.
- No history/result schema changes.
- No solver behavior changes.
- No Rust execution or solver migration.
- No Progressive Solver implementation.

Recommended next:

- `OOE-RS14`, `OOE-RS15`, and `OOE-RS16` carried the first stale gates plus active job registry. The current live follow-up is `OOE-RS17`: cancellation contract.


## OOE-RS14 - Standard Calculate Stale Commit Gate

Status: implemented for standard Calculate only.

What changed:

- The Calculate mode layer now owns canonical OOE snapshot and input-revision helpers for standard expression actions.
- The TypeScript OOE job-contract helper can resolve the active input revision lazily when pilot metadata is built.
- Standard Calculate `evaluate`, `simplify`, `factor`, and `expand` now enforce RS12/RS13 commit legality before committing a completed payload.
- Stale standard Calculate completions are silently dropped; replay substitution snapshots are preserved when no commit happens.
- OOE unavailable, missing-plan, invalid-plan, and bridge-error statuses remain fail-open if the active input revision still matches.

Boundaries:

- Calculate workbench routes are unchanged.
- Algebra-tray transforms are unchanged.
- Equation and Table pilots remain metadata-only and do not enforce stale-result gates yet.
- No cancellation, scheduler, trace buffer, UI diagnostics, history/result schema changes, solver behavior changes, Rust execution, MCP diagnostics, remote execution, or Progressive Solver implementation.

Recommended next:

- `OOE-RS15` extended stale-commit enforcement to existing OOE-covered Equation routes, and `OOE-RS16` added active job registry. The current live follow-up is `OOE-RS17`: cancellation contract.


## OOE-RS15 - Equation Stale Commit Gate

Status: implemented for existing OOE-covered Equation routes only.

What changed:

- The Equation mode layer now owns canonical OOE snapshot and input-revision helpers for Equation solve requests.
- `runEquationModeWithOoePilot` accepts lazy active-revision options and keeps direct payload parity with `runEquationMode`.
- Symbolic Equation solve and Equation numeric-interval solve now enforce RS12/RS13 commit legality before committing a completed payload.
- Stale Equation completions are silently dropped; stale numeric Equation drops preserve replay substitution snapshots.
- OOE unavailable, missing-plan, invalid-plan, and bridge-error statuses remain fail-open if the active input revision still matches.

Boundaries:

- Non-symbolic Equation screens are unchanged.
- Linear systems, polynomial systems, coefficient polynomial tools, and algebra transforms are unchanged.
- Table still records commit metadata only and does not enforce stale-result gates yet.
- No active job registry, scheduler, cancellation, trace buffer, UI diagnostics, history/result schema changes, solver behavior changes, Rust execution, MCP diagnostics, remote execution, or Progressive Solver implementation.

Traffic-controller sequence:

- `OOE-RS16`: active job registry.
- `OOE-RS17`: cancellation contract.
- `OOE-RS18`: editor runtime containment and control lane.

Recommended next:

- `OOE-RS16` added the internal active job registry. The current live follow-up is `OOE-RS17`: cancellation contract before editor containment.


## OOE-RS16 - Active Job Registry

Status: implemented as internal registry/control state only.

What changed:

- Added an in-memory OOE active job registry with active records and a bounded recent lifecycle buffer.
- Registry records include job identity, plan/capability/host/node/phase IDs, route label, lifecycle status, timestamps, commit assessment, trace events, and optional error text.
- Standard Calculate expression, shared Equation, and active Table OOE pilots now register jobs while preflight/runtime work is active.
- Terminal jobs move into recent records as `completed`, `staleDropped`, `skipped`, or `failed`.
- Throwing wrapped runtime functions mark the active registry record as failed and rethrow.

Boundaries:

- No cancellation contract or cancellation behavior.
- No scheduler or priority runner.
- No UI diagnostics, trace panel, MCP endpoint, history schema change, result schema change, result wording change, solver behavior change, Rust execution, remote execution, or Progressive Solver implementation.
- Table remains metadata-only and does not enforce stale-commit gating.

Traffic-controller sequence:

- `OOE-RS17`: cancellation contract.
- `OOE-RS18`: editor runtime containment and control lane.

Recommended next:

- `OOE-RS17`: add cancellation contract metadata/helpers over the active job registry without wiring visible Stop controls or killing solver work yet.


## OOE-RS17 - Cancellation Contract

Status: implemented as internal cancellation contract state only.

What changed:

- Added cancellation request metadata to active OOE job records.
- Added active `cancelRequested` and terminal `cancelled` lifecycle states.
- Added helper APIs to request cancellation by registry ID, request the latest active job for a capability, query cancellation request state, and mark an active job terminally cancelled.
- Cancellation request metadata is preserved when current non-cancellable jobs complete or fail normally.

Boundaries:

- Expression, Equation, and Table pilots do not check cancellation or skip current runtime work.
- Current TypeScript one-shot solvers remain non-interruptible once entered.
- No visible Stop controls, scheduler, worker isolation, hard interruption, Rust solver migration, trace buffer, MCP diagnostics, history/result schema changes, result wording changes, or solver behavior changes.

Traffic-controller sequence:

- `OOE-RS18`: editor runtime containment and control lane.

Recommended next:

- `OOE-RS18`: wire editor/runtime controls around contained analysis/execution lanes so cancellation requests have a safe control surface before any deeper solver migration.


## OOE-RS18 - Editor Runtime Containment And Control Lane

Status: implemented as the first visible editor control-lane slice.

What changed:

- Added a current-lane editor runtime control helper outside the OOE core boundary so UI/app surfaces can request cancellation without polluting `src/lib/ooe`.
- Mapped standard Calculate, Equation symbolic, and active Table surfaces to their existing OOE capability lanes.
- Display-header `Run` resumes editor analysis and executes the existing primary action.
- Display-header `Stop` pauses editor analysis and requests RS17 cancellation for the latest active current-lane OOE job when one exists.
- Display-header `Restart Editor` requests current-lane cancellation, clears the active draft/result state, resumes analysis, increments editor generation, and remounts MathEditor.
- Added reusable MathEditor containment with a contained fallback and Restart Editor action for render crashes.
- Kept active Equation runtime import opportunistically warm after the Equation surface opens, preserving lazy startup while avoiding solve-lane sluggishness after bundle splitting.
- OOE snapshot canonicalization skips undefined optional fields so absent optional route data and explicit `undefined` route data hash identically.

Boundaries:

- Current Expression, Equation, and Table pilots still do not check cancellation or skip runtime work.
- Current TypeScript one-shot solvers remain non-interruptible once entered.
- RS14/RS15 stale-commit gates remain the real protection against stale Calculate/Equation results.
- No scheduler, worker/iframe sandbox, Rust solver execution, trace panel, MCP diagnostics, history/result schema changes, result schema changes, solver output changes, or Progressive Solver behavior.

Recommended next:

- Pause OOE RS continuation for `EQUATION-ANSWER-MODES1`, then resume with `OOE-RS19` after Equation jobs can encode answer intent.
- Candidate `OOE-RS19` topics remain Table stale-commit gating, editor analysis budgeting/cooperative pause, or answer-intent-aware runtime metadata before deeper worker/Rust migration.


## EQUATION-ANSWER-MODES1 - Equation Answer Intent Before OOE-RS19

Status: implemented as product-facing answer-mode intent and OOE snapshot metadata only.

What changed:

- Added persisted Equation answer modes: `exact`, `approximate`, and `isolate`.
- `Exact` is the strict symbolic selected-target solve behavior and stops numeric-only fallback output with guidance.
- `Approx` uses the existing numeric interval solve path, guides users to enable/provide an interval instead of inventing one, and stops if non-target symbolic parameters remain after stored-value substitution.
- `Isolate` uses selected-target isolation as textbook formula rearrangement: it can peel target-free shells and apply direct inverse operations such as real root branches for simple powers, showing even-power formulas with `\pm`, but it does not delegate into broad Exact-mode solving or target-containing denominator/radical isolation.
- Direct-power Exact mode now prefers bounded algebraic power isolation for `u^3=a` and `u^4=a` before exp/log, keeping real-branch behavior honest.
- Equation OOE snapshots and input revisions now include the selected answer mode, so future OOE jobs can distinguish answer intent.

Boundaries:

- No OOE scheduler, cancellation, trace buffer, runtime routing, or Rust solver execution change.
- No broad Equation solver family, broad simplification engine, fake exact answer, or Equation symbolic stored-value substitution.

Recommended next:

- Resume OOE with `OOE-RS19` now that Equation answer intent is explicit in route snapshots.


## OOE-RS19 - Table Stale Commit Gate And Roadmap Extension

Status: implemented for active Table builds only.

What changed:

- Added canonical Table OOE snapshot and input-revision helpers in the Table mode layer.
- Table snapshots include primary formula, secondary formula, secondary enabled state, range, step, stored variables, and replay substitution snapshot.
- `runTableModeWithOoePilot` now accepts the existing OOE job-context options so active revisions can be resolved lazily.
- Active `useTableRuntime` keeps a ref-backed latest Table request and passes a lazy active-revision resolver into the Table OOE pilot.
- Active Table builds now commit `TableResponse`, `DisplayOutcome`, and replay-snapshot clearing only when the OOE commit assessment is allowed.
- Stale Table completions are silently dropped and leave the previous visible table/result in place.
- The active job registry records stale-dropped Table jobs through the existing RS16 lifecycle path.

Boundaries:

- Legacy `modeActionHandlers.ts` Table path remains unchanged.
- Table math, response rows, warnings, stored-value behavior, replay snapshots, history schema, result wording, and UI layout remain unchanged.
- No central coordinator, scheduler, cancellation enforcement, trace UI, MCP endpoint, worker/Rust host migration, Progressive Solver behavior, broad OOE routing change, result schema change, or history schema change.

Why this matters:

- Standard Calculate and Equation already enforced stale-result commit legality in RS14 and RS15.
- RS19 closes parity for active Table builds so all existing OOE-covered user runtime lanes now have stale-commit protection where the active runtime consumer participates.
- This is still not the central traffic controller. It prepares the last missing stale gate before the coordinator milestone.

Recommended next:

- `OOE-RS20`: central runtime coordinator.


## Post-RS19 Roadmap Extension

This sequence is the next traffic-controller path after the three existing OOE-covered runtime lanes have stale-commit protection.

### `OOE-RS20` - Central Runtime Coordinator

Status: implemented for existing OOE-covered lanes.

Goal:

- Add one internal coordinator API that owns the common lifecycle for existing OOE-covered lanes: standard Calculate, Equation symbolic/numeric interval, and active Table.

What changed:

- Added one coordinator entrypoint for starting job identity, starting the active registry record, running OOE plan preflight, executing the existing TypeScript payload function, resolving post-run commit assessment, completing or failing the active registry record, and returning the same envelope payload.
- Migrated standard Calculate expression actions, Equation symbolic/numeric interval, and active Table builds to the coordinator through their existing OOE pilot wrappers.
- Kept active input revision resolution after runtime execution so in-flight input changes still produce stale-drop commit assessments.
- Preserved Equation guarded stage trace metadata and current stage order.
- Registered the coordinator as an OOE core file in the boundary validator.

Boundaries:

- No visible output changes.
- No new scheduler yet.
- No Rust solver execution.
- No Progressive Solver implementation.
- No trace buffer, MCP diagnostics, worker isolation, UI change, result schema change, history schema change, or new math capability.

Recommended next:

- `OOE-RS21`: editor analysis budget lane.

### `OOE-RS21` - Editor Analysis Budget Lane

Status: implemented for existing editor-analysis surfaces.

Goal:

- Bring deferred editor analysis under explicit OOE traffic-control budgeting so preview, hints, target discovery, and transform eligibility cannot compete unfairly with typing or explicit runtime actions.

What changed:

- Added editor-analysis built-in OOE plans under category `editor` for variable hints, Equation target discovery, Calculate transform eligibility, Equation transform eligibility, and preview render handoff.
- Registered those plans on host `editor-analysis-runtime` with deterministic plan/node/phase IDs, stale-drop cancellation, `commitIfCurrent`, and conservative classic local execution metadata.
- Added a TypeScript editor-analysis OOE helper that builds stable snapshots from lane ID, source LaTeX, context key, and editor generation.
- Routed debounced editor analysis through the central OOE coordinator only after existing debounce and huge-input guard checks pass.
- Migrated variable hints, Equation target discovery, Calculate transform eligibility, Equation transform eligibility, and live preview LaTeX handoff to editor-analysis budget lanes.
- Preserved the last safe analysis value when a result is stale, skipped, stopped, guarded, restarted, or failed.
- Kept existing Run, Stop, Restart Editor, and header status behavior.

Boundaries:

- No solver routing changes.
- No visible math output changes.
- No history or result schema changes.
- No scheduler, worker sandbox, Rust solver execution, Progressive Solver behavior, MCP endpoint, trace UI, or new math capability.

Recommended next:

- `OOE-RS22`: diagnostics trace buffer with solver provenance.

### `OOE-RS22` - Diagnostics Trace Buffer

Goal:

- Add a bounded in-memory diagnostics trace buffer for OOE events, stale drops, skipped jobs, failures, and compact route provenance.

Expected scope:

- local internal trace storage with query/reset helpers
- Rust/bridge built-in plan coverage for executable workspaces: Calculate workbench/algebra transform, Advanced Calc, Trigonometry, Statistics, Geometry, Matrix, and Vector, while preserving existing Expression, Equation, Table, and Editor lanes
- coordinator-owned diagnostics recording for completed, stale-dropped, skipped, and failed jobs
- coarse provenance for executable modes: mode, route/screen/action, input summary, output kind/title/warnings/badges/strategy summaries when available, commit decision, and runtime host
- richer Equation provenance: answer mode, selected target, guarded stage attempts, winning stage/helper when known, stop summary, generated isolation/rewrite detail lines, and output hygiene/readback status when available
- no table rows in diagnostics
- developer/test-visible access only at first
- no public UI panel, Tauri trace command, or MCP endpoint yet

### `OOE-RS23` - Host Adapter Contract

Goal:

- Define typed host adapters for main-thread TypeScript, future worker/iframe hosts, future Rust/Tauri commands, and future progressive runners.

Expected scope:

- Rust-owned built-in host descriptors for current active hosts: expression, equation, table, editor-analysis, advanced-calculus, trigonometry, statistics, geometry, and linear-algebra runtimes
- TypeScript bridge and zod mirror for host descriptors
- schema-only future host kinds for web worker, iframe, Rust/Tauri command, and progressive runner hosts
- coordinator-attached host metadata in runtime envelopes and diagnostics records
- fail-open host adapter statuses: ready, unavailable, missing-host, incompatible-host, and bridge-error
- no solver migration required
- host capability must describe thread safety, budget policy, cancellation mode, and result stability
- no scheduler, budget enforcement, cancellation enforcement, public diagnostics UI, MCP endpoint, worker/Rust migration, Progressive Solver behavior, history/result schema change, or solver behavior change

### `OOE-RS24` - Cooperative Budget And Cancellation Pilot

Goal:

- Make active Table build actually observe OOE budget/cancellation checks cooperatively.

Expected scope:

- use existing cancellation contract and active job registry
- keep Table on the current main-thread TypeScript host
- preserve synchronous `runTableMode` as the reference path
- run the OOE Table wrapper through cooperative row-batch checkpoints and event-loop yields
- commit a controlled cancellation note when Stop cancels the active Table job
- do not replace the previous `TableResponse` or clear replay substitutions on cancellation
- no hard interruption, Equation cancellation, Progressive Solver, isolated host migration, or broad solver rewrite

### `OOE-RS25` - First Isolated Runtime Pilot

Goal:

- Move one bounded runtime path behind an isolated host boundary so Stop/Restart can prevent that host from affecting the rest of the app.

Expected scope:

- active Table build is the pilot lane
- Web Worker is the selected isolated host
- `table-worker-runtime` is the active `table.build` host with `webWorker`, `workerSafe`, `isolated`, and `hardStop` metadata
- `table-runtime` remains the cooperative main-thread fallback host
- preserve payload parity with the current synchronous `runTableMode` reference on successful completion
- terminate the worker on cancellation and return the existing controlled Table cancellation note
- record selected worker/fallback/cancel host execution metadata in OOE envelope provenance and diagnostics without storing table rows
- preserve RS19 stale-drop behavior and RS24 cancellation visible-state rules

Boundary:

- no Equation cancellation
- no Progressive Solver behavior
- no Rust solver execution
- no public diagnostics UI or MCP endpoint
- no history schema, result schema, row limit, or Table math semantic change
- no broader worker migration beyond the active Table build pilot

### Post-`OOE-RS25` Expansion Arc

Goal:

- Use the completed OOE foundation to control harder synchronous solver paths.

Expected sequence:

- `OOE-RS26`: Equation guarded-stage cancellation checkpoints. Status: implemented.
- `OOE-RS27`: Equation heavy-helper isolation pilot. Status: implemented.
- `OOE-RS28`: Broaden Equation cancellation coverage across more helper families.
- `OOE-RS29`: Developer diagnostics surface or local read-only MCP diagnostics, to be chosen by priority.

Boundary:

- Do not rename or repurpose `OOE-RS25`; it remains the first isolated runtime pilot.
- This arc is paused after `OOE-RS25` while inequalities and complex-number foundations are established.
- The pause is intentional sequencing, not cancellation: `OOE-RS26` through `OOE-RS29` remain the next OOE upgrade notes.
- Resume OOE after the new solver-domain foundations are stable enough that Equation cancellation/provenance can describe real, complex, and inequality-aware outcomes accurately.

### `OOE-RS26` - Equation Guarded-Stage Cancellation Checkpoints

Status: implemented.

Goal:

- Make active `equation.solve` OOE jobs respond to Stop at guarded-stage boundaries while preserving visible Equation state.

What changed:

- Added an Equation-local guarded solve control interface that adapts from the coordinator runtime context without importing OOE types into Equation core.
- Added cancellation checkpoints before guarded stages, after no-outcome stage exits, before recursive guarded-solve handoffs, and before direct symbolic fallback.
- Extended guarded replay traces with cancellation stage/depth/phase evidence.
- Updated Equation OOE metadata to mark cancelled jobs with terminal `cancelled` completion, `notApplicable` commit assessment, and final cancelled trace status.
- Extended Equation provenance so diagnostics can explain where cancellation was observed.
- Updated Equation runtime controller cancellation handling so cancelled envelopes do not commit a result, append history, update `Ans`, clear replay substitutions, or replace the previous visible output.

Boundary:

- No interruption inside a currently executing heavy helper.
- No Equation worker isolation.
- No Rust solver execution.
- No scheduler rewrite.
- No public diagnostics UI or MCP endpoint.
- No result schema or history schema change.
- No solver capability change.

### `OOE-RS27` - Equation Direct-Symbolic Helper Isolation Pilot

Status: implemented.

Goal:

- Make the terminal guarded `direct-symbolic` helper interruptible through an isolated host while keeping the top-level Equation route on the main Equation runtime.

What changed:

- Added `equation-direct-symbolic-worker-runtime` as a helper host descriptor with `webWorker`, `workerSafe`, `isolated`, and `hardStop` metadata.
- Kept `plan.equation.solve` on `equation-runtime`; helper execution evidence is recorded in guarded trace/provenance instead of moving the route host.
- Added a Vite module worker and worker client for the guarded direct-symbolic fallback helper.
- Added an Equation-local async direct-symbolic runner adapter so Equation core does not import OOE types.
- Worker completion preserves the current main-thread direct-symbolic fallback payload.
- Worker unavailable, initialization failure, and runtime failure fallback to the main-thread helper with helper-host evidence.
- Cancellation hard-terminates the worker, records helper cancellation termination evidence, and returns the RS26 cancellation envelope without fallback.

Boundary:

- No full Equation solver worker migration.
- No interruption inside non-direct-symbolic helper families.
- No Rust solver execution.
- No scheduler rewrite.
- No public diagnostics UI or MCP endpoint.
- No result schema or history schema change.
- No solver capability change.

## OOE And Progressive Solver Boundary

OOE is the app traffic controller. It controls ordering, priority, budgets, stale commits, cancellation contracts, host routing, lifecycle metadata, traceability, and diagnostics.

Progressive Solver is a separate future execution strategy. It may use chunking, search-first materialization, streaming committed artifacts, and idempotent checkpoint ledgers. It can depend on OOE for job identity, budgets, cancellation, host selection, traces, and commit legality, but OOE does not require Progressive Solver to become useful.

Atomic remains deferred future language for aggressive multi-host execution. It is not active in this RS sequence.
