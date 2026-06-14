# Modes Surface Roadmap Audit

Status: audit

Purpose: record the post-Equation full sweep of `src/lib/modes/` and choose a major follow-up lane. This audit is intentionally broader than the earlier audit-then-split loop: it classifies the whole Modes folder after `MODES-EQUATION-TEST-SURFACE-TIDY1` and `MODES-EQUATION-DISTRICT-SPLIT1`, then recommends the next sequential milestone.

## Current Sweep

- Total current `src/lib/modes/` size: about 11.7k lines across mode facades, worker clients, worker entrypoints, mode tests, and the private Equation mode district.
- Largest production file: `calculate.ts` at 787 lines.
- Largest mode tests: `equation/shared-symbolic-backend.test.ts` at 717 lines, `calculate.test.ts` at 599 lines, and `table.test.ts` at 491 lines.
- No current Modes file is over the default 900-line ratchet.
- `equation.ts` is now a 22-line compatibility facade. Its private orchestration modules and focused tests live under `src/lib/modes/equation/`.
- The older `modes-root-surface-audit.md` remains a useful baseline, but its ratchet-pressure section is now stale because Equation mode and Equation mode tests have already been split.

## Current Surface Classification

- Calculate quickform surface: `calculate.ts`, `calculate.test.ts`, `calculate-navigation.ts`, `calculate-navigation.test.ts`, `calculate-worker-client.ts`, `calculate-worker-runtime.test.ts`, and `calculate.worker.ts`.
- Equation mode district: root `equation.ts` plus private modules and tests under `equation/`; `equation-ui-model.ts`, `equation-worker-client.ts`, `equation-worker-runtime.test.ts`, `equation-complex-stability.test.ts`, and `equation.worker.ts` remain root-adjacent seams.
- Table surface: `table-core.ts`, `table.ts`, `table.test.ts`, `table-worker-client.ts`, and `table.worker.ts`.
- Linear Algebra mode surface: `matrix.ts`, `vector.ts`, `linear-algebra-worker-client.ts`, `linear-algebra-worker-runtime.test.ts`, and `linear-algebra.worker.ts`.
- Thin runtime facades: `calculus.ts`, `geometry.ts`, `statistics.ts`, and `trigonometry.ts` delegate to their owned capability layers and worker clients.
- Worker entrypoints and clients: `*.worker.ts` and `*-worker-client.ts` preserve bundler paths, host ids, fallback behavior, cancellation behavior, startup timing, and host execution evidence.
- Shared helpers: `core-mode.ts` and `worker-runtime-config.ts` are intentionally small root seams.

## Responsibility Map

- Modes own product-facing request/result orchestration, runtime envelope attachment, OOE route snapshots, input revision ids, worker fallback wrappers, and mode-specific readback integration.
- Modes consume solver/capability layers from Algebra, Equation, Calculus, Trigonometry, Geometry, Statistics, Table, Linear Algebra, and the semantic planner.
- Modes do not own solver math, display rendering policy, OOE traffic-control policy, worker-host registry policy, history schema evolution, or broad runtime framework design.
- Worker clients are operational seams, not solver seams. They should not be grouped or generalized unless a later milestone explicitly owns host ids, fallback evidence, cancellation, bundler entrypoints, and worker startup behavior.

## Roadmap Decision

The next major Modes implementation lane should be `MODES-CALCULATE-FOUNDATION1`.

Rationale:

- Calculate is the remaining broad production orchestrator in Modes.
- Its pressure is not just line count. It mixes quickform request contracts, OOE snapshots, runtime capability selection, planner routing, stored-variable policy, derivative/integral/limit protected-name behavior, explicit algebra transforms, legacy workbench requests, and worker-pilot wrappers.
- Calculate sits on a product boundary: it should remain a compact quickform workspace, while richer guided workflows stay in topic workspaces or a later shared step engine.
- Table, Matrix, Vector, and the thin facades are smaller and clearer; splitting them now would mostly create churn.
- Worker/client consolidation is tempting because the files look repetitive, but it is runtime-host-sensitive and should stay behind a dedicated future milestone.

## Recommended Major Milestone

`MODES-CALCULATE-FOUNDATION1` should be one coordinated sequential milestone rather than several small audit/split pairs.

Suggested gates:

- Gate A: refresh Calculate boundary notes inside the milestone and confirm it remains quickform, not a guided topic workspace.
- Gate B: split `calculate.test.ts` only where it directly improves safety rails for the production move.
- Gate C: keep root `calculate.ts` as the public facade and move private internals under `src/lib/modes/calculate/`.
- Gate D: split likely modules for contracts, OOE snapshots, stored-value policy, standard run, algebra transforms, runtime request routing, and worker-pilot wrappers.
- Gate E: run focused Calculate, navigation, worker-runtime, mode, runtime-controller, file-size, memory, lint, and build gates before committing.

Expected public boundary:

- Keep public imports from `src/lib/modes/calculate.ts` stable.
- Keep `calculate-navigation.ts`, `calculate-worker-client.ts`, and `calculate.worker.ts` in place unless the milestone explicitly scopes a tiny import adjustment.
- Preserve `calculate.evaluate`, `calculate.algebraTransform`, `calculate.workbench`, standard `expression.*` capability ids, OOE input revision parity, runtime envelopes, stored-value substitution policy, derivative/integral/limit protected variable policy, and all existing output wording.

## Calculate Foundation Record

- `MODES-CALCULATE-FOUNDATION1` converted root `src/lib/modes/calculate.ts` into a compatibility facade.
- Private Calculate mode internals now live under `src/lib/modes/calculate/` for request contracts, OOE snapshots, result titles, stored-value policy, standard quickform execution, explicit Algebra transforms, and runtime/OOE wrapper wiring.
- The broad root `calculate.test.ts` suite was split into focused compatibility suites under `src/lib/modes/calculate/`, with imports kept pointed at the root facade.
- `calculate-navigation.ts`, `calculate-worker-client.ts`, and `calculate.worker.ts` stayed in place.
- The milestone preserved quickform behavior, public imports, OOE revision parity, runtime envelopes, capability ids, stored-value policy, worker fallback wiring, and output wording.

## Deferred Lanes

- `MODES-WORKER-CLIENT-SURFACE-AUDIT1`: audit worker client/entrypoint repetition after Calculate foundation work. Do not group workers as a side effect of Calculate cleanup.
- `MODES-TABLE-SURFACE-TIDY1`: optional later cleanup if Table tests or table-core grow; no current pressure.
- `MODES-LINEAR-ALGEBRA-FACADE-TIDY1`: optional later consistency pass for Matrix/Vector only if product/runtime behavior requires it.
- `MODES-THIN-FACADE-CLOSURE1`: optional docs-only closure for Calculus, Geometry, Statistics, and Trigonometry facades; not an implementation priority.

## High-Risk Contracts

- Preserve mode public import paths used by AppMain, runtime controllers, workers, UI tests, and history/replay callers.
- Preserve OOE snapshot and input revision builders for launch requests, active revisions, route snapshots, and history tickets.
- Preserve worker host ids, fallback host ids, cancellation wording, startup timeout behavior, and host execution evidence.
- Preserve stored-variable replay snapshots, protected substitution behavior, runtime advisories, planner badges, result origins, transform badges, and display outcome shape.
- Do not use Modes cleanup to move solver logic into Modes or to change OOE traffic-control policy.

## Test Gates For The Roadmap Audit

- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move production code or tests during this roadmap audit.
- Do not group worker/client files during this roadmap audit.
- Do not change solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, stored-value behavior, worker-host behavior, answer-mode behavior, domain-intent behavior, or reserved-symbol policy.
