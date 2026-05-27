# OOE-RS0 Readiness Audit

status: readiness audit
created: 2026-05-27
milestone: OOE-RS0
primary_agent: codex
primary_agent_model: gpt-5
attribution_basis: live

## Purpose

`OOE-RS0` locks Order Of Execution as Calcwiz's future Rust-first traffic-control contract. This is an architecture/readiness milestone only: it records the execution seams that already exist, the policy vocabulary that `OOE-RS1` should encode, and the boundaries that prevent OOE from becoming a solver rewrite or UI controller.

OOE should eventually answer these questions for each unit of work:

- which capability is running
- which runtime host owns it
- which phase/stage is legal next
- what priority and budget apply
- whether it is main-thread safe
- whether it is cancellable or stale-drop safe
- whether the result may commit
- what trace proves what happened

## Non-Goals For RS0

`OOE-RS0` does not add runtime behavior. In particular, it does not add:

- Rust OOE modules
- Tauri OOE commands
- TypeScript OOE bridge types
- runtime routing or scheduling
- solver cancellation
- solver rewrites
- source-mirror, Playground, Labs runner, or remote execution
- MCP server or diagnostic bridge
- Progressive Solver, chunk scheduler, checkpoint ledger, or streamed result UI

## Current Execution Seams

### Kernel Capabilities And Hosts

Current TypeScript capabilities live in `src/lib/kernel/capabilities.ts`:

- `expression.evaluate`
- `expression.simplify`
- `expression.factor`
- `expression.expand`
- `equation.solve`
- `table.build`

Current TypeScript runtime hosts live in `src/lib/kernel/runtime-hosts.ts`:

- `expression-runtime`
- `equation-runtime`
- `table-runtime`

These are the first capability and host IDs that `OOE-RS1` should mirror as string IDs. OOE must not widen the public capability set while only validating schemas.

### Runtime Profiles And Budgets

`src/lib/kernel/runtime-profile.ts` owns the current default execution profile:

- Equation budget:
  - `maxRecursionDepth: 4`
  - `maxCompositionInversionDepth: 3`
  - `maxPeriodicReductionDepth: 3`
  - `maxRadicalTransformSteps: 2`
  - `maxRepeatedClearingSteps: 1`
- Expression budget:
  - `allowEvaluateRealNumericFallback`
  - `allowSymbolicNormalizationNumericFallback`
  - `allowInternalSolveNumericFallback`

`OOE-RS1` should model budget identity and budget attachment, but it should not reinterpret or change these values.

### Stop Policy And Runtime Envelopes

`src/lib/kernel/runtime-policy.ts` classifies current runtime stops and advisories:

- invalid request
- planner hard stop
- range guard
- unsupported family

`src/lib/kernel/runtime-envelope.ts` attaches runtime metadata to `DisplayOutcome` without changing the underlying math result.

`OOE-RS1` should prepare a validation vocabulary for stop/status/stability, but display outcomes should remain unchanged until a later runtime-envelope integration milestone.

### Guarded Equation Stage Order And Trace

`src/lib/equation/guarded/run.ts` already has the most explicit execution order in the app. The current guarded stage order is:

1. `numeric-interval`
2. `bounded-polynomial`
3. `algebra-transform`
4. `composition`
5. `direct-trig`
6. `rewrite-trig`
7. `substitution`
8. `direct-symbolic`

The current guarded replay trace records stage attempts by depth and the winning stage ID. `OOE-RS1` should not consume this TypeScript trace yet, but it should make room for `phaseId`, `stageId`, status, and dependency validation so a later guarded Equation pilot can wrap the existing order without changing it.

### Editor Analysis Runtime

`src/lib/editor/editor-analysis-runtime.ts` is the current editor-local containment model. It supports:

- debounce
- max input length guard
- stopped state
- stale snapshot reporting
- restart
- contained analysis errors

This is not a true job runtime and it does not cancel synchronous solvers. It is the clearest existing example of deferred, stale-drop-safe work and should inform the later OOE `deferred` task class.

### BUNDLE-SPLIT1 Boundary

`BUNDLE-SPLIT1` reduced startup-loaded JavaScript through named chunks, lazy workspaces/side surfaces, dynamic runtime imports, and a bundle-size check. This is a startup-size optimization, not an OOE scheduler.

OOE should later govern execution priority and host policy, while bundle splitting remains build/runtime-loading infrastructure.

### Rust Entrypoint

The current Rust app has no OOE module tree yet:

- `src-tauri/src/lib.rs`
- `src-tauri/src/main.rs`

`OOE-RS1` should create `src-tauri/src/ooe/` as the first Rust OOE module. It should wire into `lib.rs` only enough for Rust tests to compile. It should not expose Tauri commands until `OOE-RS3`.

## Traffic Classes To Preserve

`OOE-RS1` should reserve vocabulary for these classes without scheduling them yet:

- `immediate`: typing, caret movement, button response
- `deferred`: variable hints, preview, target discovery, transform eligibility
- `explicit`: Solve, Evaluate, Table build, guided actions
- `heavy`: symbolic solving, future Rust jobs, progressive-ready work
- `render-limited`: long result cards, branch sets, matrices, large formulas
- `background`: autosave, history persistence, diagnostic trace buffering

## Traceability Requirements

Traceability is a requirement, not an RS0 implementation. Future trace and diagnostics work should be:

- local-dev first
- bounded in memory
- privacy-aware
- disabled or quiet in normal release builds
- read-only for the first MCP diagnostics bridge
- unable to execute solvers, source mirrors, Playground code, file actions, remote jobs, or arbitrary commands

Future trace events should eventually be able to record:

- trace/job/input revision identity
- capability and host
- phase and stage
- priority and budget
- status and result stability
- stop/error class
- duration
- commit or stale-drop decision

## OOE-RS1 Inputs

`OOE-RS1` should implement only Rust schema plus pure validation. The first schema should include:

- capability IDs and host IDs as strings
- node IDs and phase IDs as strings
- task class
- priority class
- cancellation policy
- commit policy
- thread-safety policy
- result stability
- OOE node
- OOE plan
- OOE trace event shape
- structured validation errors

The first validation pass should check:

- plan ID and node IDs are non-empty
- node IDs are unique
- dependency references exist
- dependency graph is acyclic
- each plan has a terminal result phase
- referenced capability/host IDs are non-empty strings

## Acceptance Criteria For RS0

`OOE-RS0` is complete when:

- this audit exists
- the roadmap marks RS0 as implemented
- current state, decisions, journal, checklist, and session dossier record the milestone
- `npm run test:memory-protocol` passes
- `npm run lint` passes

No runtime behavior should change.
