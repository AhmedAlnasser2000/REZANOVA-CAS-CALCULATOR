# OOE RS32 Runtime Shell And Launch-Ticket Readiness Audit

Date: 2026-06-07
Agent: gpt-5.5
Repo: `/home/ahmed/Downloads/Calculator`

## Purpose

This audit separates two ideas that must stay distinct before `OOE-RS32`:

- **Runtime shell readiness**: whether a workspace can run its work through an OOE-managed execution shell without freezing the app, with clear lifecycle, cancellation, fallback, failure, stale-drop, and diagnostics evidence.
- **Launch-ticket readiness**: whether a workspace can reserve a pending History row at launch, then finalize or discard that row without lying about replay, ordering, or persisted records.

The audit does not migrate any workspace. It records what is ready, what is risky, and what should be deferred.

## Current Baseline

### Adopted Runtime Shells

- `equation.solve` uses the Equation worker runtime shell and launch tickets from RS30.
- `table.build` uses the Table worker runtime and launch tickets from RS31.
- Both lanes can reserve pending History rows, finalize into their launch-order positions, hard-stop worker jobs, and discard cancelled/stale pending rows.

### Coarse OOE Workspaces

The remaining workspaces are currently OOE-visible through `runWorkspaceWithOoeProvenance`, not full runtime shells:

- `calculate.workbench`
- `calculate.algebraTransform`
- `advancedCalculus.evaluate`
- `trigonometry.evaluate`
- `statistics.evaluate`
- `geometry.evaluate`
- `linearAlgebra.matrix`
- `linearAlgebra.vector`

These paths produce coarse diagnostics, but they do not yet share the Equation/Table runtime-shell lifecycle, pending History tickets, hard-stop worker hosts, or consistent stale-commit handling.

## Cross-Cutting Findings

### 1. Runtime Shell And Launch Tickets Are Correctly Separate

`runtime-shell-contract.ts` models execution evidence:

- shell id
- capability id
- primary/fallback host
- lifecycle
- worker isolation
- host status
- cancellation/termination
- optional launch-ticket evidence

`launch-tickets.ts` models History ordering only:

- reserve pending row
- sort finalized and pending rows by launch order
- mark pending row stopping
- discard pending row
- preserve finalized launch order after reload

This separation is correct and should remain locked. A workspace can be runtime-shell ready before it is launch-ticket ready.

### 2. TS/Rust Host Naming Drift Exists

The Rust OOE registry/host descriptors use:

- `advanced-calculus-runtime`

The TypeScript coarse workspace pilot currently maps `advancedCalculus.evaluate` to:

- `calculus-runtime`

This is a naming drift, not a product feature. It should be fixed before or during the next OOE widening pass, because diagnostics and host evidence should not disagree across TS/Rust boundaries.

### 3. Coarse Workspace OOE Does Not Yet Enforce Full Commit Safety

Equation and Table have explicit commit gates and ticket discard/finalize behavior.

Most coarse workspace paths call `commitOutcome(...)` directly after the OOE wrapper resolves. This means they currently lack the stronger "is this still the current launch?" guard that Equation/Table rely on.

Before workerizing more workspaces, RS32 should introduce a shared per-workspace commit gate or active-run token so background completions cannot overwrite a newer visible workspace state.

### 4. History Replay Payloads Are Uneven

Launch tickets are only honest when the final History entry can replay the same job.

Current replay strength:

- Strong: Equation, Table, unified Calculus/legacy `advancedCalculus`, Calculate workbench.
- Medium: Trigonometry, Statistics, Geometry, because History stores the screen and reparses the input preview, but does not persist the richer guide seed fields that exist elsewhere.
- Weak: Matrix and Vector, because History stores only operation/input/result style information and does not persist matrix/vector operands.
- Not applicable: Editor analysis, because it is background metadata and should not create user History rows.

This means launch-ticket widening should not be universal yet.

## Workspace Readiness Matrix

| Workspace | Runtime shell readiness | Launch-ticket readiness | Recommended RS32 posture |
| --- | --- | --- | --- |
| Equation | Adopted | Adopted | Regression baseline only |
| Table | Adopted | Adopted | Regression baseline only |
| Unified Calculus / legacy `advancedCalculus` | High after host-id cleanup | High | Best RS32 candidate |
| Statistics | High | Medium-high | Good candidate after preview/replay contract |
| Matrix | High | Low-medium | Runtime shell first, tickets later |
| Vector | High | Low-medium | Runtime shell first, tickets later |
| Calculate standard | Medium | Medium-low | Defer tickets; shell needs flicker/latency policy |
| Calculate workbench/algebra transform | Medium | Medium | Needs shared commit gate first |
| Trigonometry | Medium | Medium | Defer until Equation delegation ownership is clear |
| Geometry | Medium-low | Medium-low | Defer pending ComputeEngine/module-state worker audit |
| Editor analysis | Special lane | No | No History tickets |

## Workspace Notes

### Unified Calculus / Legacy `advancedCalculus`

Runtime shell readiness: **high**

Reasons:

- `runAdvancedCalcMode` is an async engine entrypoint separated from React UI.
- Requests are structured objects plus stored-variable snapshots.
- Completed History entries already persist `advancedCalcScreen` and `advancedCalcSeed`.
- The recent surface merge made this one visible Calculus workspace while preserving legacy `advancedCalculus` mode/schema/history identifiers.

Risks:

- Numeric IVP and series/integration helpers may need cooperative checkpoints or worker hard-stop.
- The TS/Rust host-id drift must be fixed.
- Background completion must not yank the user back to Calculus if they navigated elsewhere.

Launch-ticket readiness: **high**

Calculus already has the best non-Equation/Table replay payload because `HistoryEntry` persists typed screen and seed data.

Recommendation:

`OOE-RS32` can reasonably make unified Calculus the next runtime-shell and ticket widening lane if the milestone is kept sliced.

### Statistics

Runtime shell readiness: **high**

Reasons:

- Statistics core and engine are pure TypeScript data-processing paths.
- Requests are structured and serializable.
- Work is user-visible and can be long enough to benefit from background execution and cancellation.

Risks:

- Completion currently may update working-source UI state. In a background shell, that must only happen if the original Statistics workspace state is still current.
- History replay currently stores `statisticsScreen` and reparses the input preview, not a typed `statisticsSeed`.

Launch-ticket readiness: **medium-high**

Good candidate, but it needs a compact final History preview contract and probably typed seed persistence before tickets become durable.

Recommendation:

Statistics is a strong RS33/RS34 candidate after Calculus proves the shared runtime shell outside Equation/Table.

### Matrix And Vector

Runtime shell readiness: **high**

Reasons:

- Matrix/vector mode runners are pure request -> `DisplayOutcome` functions.
- Inputs are numeric arrays plus operation and angle unit.
- They are likely easy to serialize into a worker.

Risks:

- Current history/replay does not persist matrix/vector operands.
- Replay from History only shows the saved result card; it does not restore matrices/vectors into the workspace.

Launch-ticket readiness: **low-medium**

Tickets would reserve a row for a job whose final record cannot fully restore the job inputs. That is not acceptable for launch-order History.

Recommendation:

Matrix/Vector can get runtime shells before launch tickets. Add `matrixSeed` and `vectorSeed` history fields before ticket adoption.

### Calculate Standard

Runtime shell readiness: **medium**

Reasons:

- Standard Calculate already has stronger OOE pilot/stale behavior than most workspaces.
- It is frequent and user-visible.

Risks:

- Calculate actions are often fast. Pending tickets may create UI flicker unless gated by duration or job class.
- Workerizing expression evaluation needs a clear parser/ComputeEngine worker-safety check.
- `Ans`, stored values, and auto-switch prompts need careful commit semantics.

Launch-ticket readiness: **medium-low**

History tickets should probably be thresholded or reserved only for jobs classified as potentially long.

Recommendation:

Do not use Calculate as the next broad ticket pilot. It needs a flicker policy first.

### Calculate Workbench And Algebra Transform

Runtime shell readiness: **medium**

Reasons:

- The workbench paths are already under coarse OOE provenance.
- Some seeds are persisted through `calculateScreen` and `calculateSeed`.

Risks:

- Algebra transform and workbench paths still commit directly after coarse OOE resolution.
- Need a shared active-run token/commit gate before background execution.

Launch-ticket readiness: **medium**

Can be made ticket-ready after standardizing which workbench actions deserve pending History.

Recommendation:

Defer until the shared commit gate exists.

### Trigonometry

Runtime shell readiness: **medium**

Reasons:

- Trig core is separate from React UI.
- Many routes are pure and serializable.

Risks:

- Trig equation solving can delegate to shared Equation solving. If Trig runs in its own shell and then delegates to Equation, ownership of cancellation, diagnostics, and History tickets can become ambiguous.
- History replay stores `trigScreen` and reparses input, but does not persist typed `trigSeed`.

Launch-ticket readiness: **medium**

Tickets are possible, but only after deciding whether delegated Equation solving creates a Trig ticket, an Equation ticket, or one parent ticket with child provenance.

Recommendation:

Defer runtime-shell migration until delegation ownership is specified.

### Geometry

Runtime shell readiness: **medium-low**

Reasons:

- Geometry core is separated from UI and mostly numeric.

Risks:

- Geometry core owns a module-scope `ComputeEngine` instance.
- Worker migration needs an explicit ComputeEngine-in-worker initialization audit.
- History replay stores `geometryScreen` and reparses input, but not typed `geometrySeed`.

Launch-ticket readiness: **medium-low**

Need better replay seed persistence before launch tickets.

Recommendation:

Defer until worker-safety and replay-seed audit is done.

### Editor Analysis

Runtime shell readiness: **special**

Editor analysis already has debounced OOE lanes and should remain separate from user-visible result jobs.

Launch-ticket readiness: **no**

Editor analysis should never create History tickets.

Recommendation:

Keep it outside the launch-ticket system.

## Recommended RS32 Shape

The safest RS32 is not "widen everything." It should be a sliced milestone with two concrete parts:

### Slice A: OOE Widening Guardrails

- Fix the `advancedCalculus.evaluate` TS host id to match `advanced-calculus-runtime`.
- Add a shared active-run/commit-gate helper for coarse workspace jobs before any new worker shell.
- Normalize diagnostics so coarse shell candidates can report current host/fallback/evidence in the same vocabulary as Equation/Table.

### Slice B: Unified Calculus Runtime Shell And Ticket Pilot

- Add a Calculus worker shell around legacy `advancedCalculus.evaluate`.
- Preserve the visible unified Calculus workspace and legacy mode id.
- Reserve/finalize/discard pending History tickets for Calculus only.
- Preserve `advancedCalcScreen` and `advancedCalcSeed` on finalized entries.
- Keep background completion from changing the active workspace if the user navigated elsewhere.

## Deferred Follow-Ups

### HISTORY-WORKSPACE-SEEDS1

Before universal tickets, add or strengthen persisted replay seeds for:

- Trigonometry
- Statistics
- Geometry
- Matrix
- Vector

Matrix and Vector especially need operand seed fields before launch tickets are honest.

### OOE-RS33 Or RS34 Candidate

After Calculus:

- Statistics is the strongest next runtime shell candidate.
- Matrix/Vector are strong runtime candidates but should wait for history seed support before tickets.

### Trig Delegation Contract

Before Trigonometry runtime-shell adoption, define whether delegated Equation solving is:

- a child job under one Trig parent ticket,
- a separate Equation job,
- or a main-thread subroute with Trig-owned provenance.

## Bottom Line

Runtime-shell widening can continue, but launch-ticket widening must be stricter. A worker shell protects app responsiveness; a launch ticket makes a user-facing promise about History order and replay. Those promises are only safe for workspaces with complete replay context.

Recommended next milestone:

`OOE-RS32: Calculus Runtime Shell And Ticket Pilot`

with an opening guardrail slice for host-id cleanup and shared commit gating.
