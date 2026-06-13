# Modes Calculate Foundation

Status: split record

Purpose: record `MODES-CALCULATE-FOUNDATION1`, the structure-only split of Calculate mode orchestration behind the stable root `src/lib/modes/calculate.ts` facade. Calculate remains a compact quickform workspace; richer guided workflows stay in topic workspaces or a later shared step engine.

## Public Surface

- `calculate.ts` remains the compatibility facade for Calculate mode public imports.
- Public request types, runtime request types, OOE snapshot/revision helpers, standard execution, algebra transform execution, runtime request routing, and OOE pilot wrappers keep their existing names.
- `calculate-navigation.ts`, `calculate-worker-client.ts`, and `calculate.worker.ts` stay in place.

## Private District Shape

- `types.ts` owns Calculate request and runtime request contracts.
- `ooe-snapshot.ts` owns standard/runtime route snapshots, capability id selection, and input revision ids.
- `titles.ts` owns Calculate result title and derivative strategy merge helpers.
- `stored-values.ts` owns stored-value protected-name policy, calculus bound-name collection, derivative-at-point substitution, and readback labels.
- `standard.ts` owns standard quickform execution through the semantic planner and math engine.
- `transforms.ts` owns explicit Algebra transform execution.
- `runtime.ts` owns runtime request dispatch and OOE pilot/isolated-worker wrapper wiring.

## Test Surface

- The former broad root `calculate.test.ts` was split into focused compatibility suites under `src/lib/modes/calculate/`.
- Moved tests continue importing from the root `../calculate` facade.
- Calculate navigation and worker-runtime tests remain root-adjacent because their production files were intentionally left in place.

## Preserved Contracts

- Public imports, capability ids, OOE input revision parity, route snapshots, runtime envelopes, worker fallback wiring, stored-variable substitution policy, replay snapshots, derivative/integral/limit protected-variable policy, transform badges, result origins, and output wording remain unchanged.
- The split does not move solver ownership into Modes and does not change OOE traffic-control policy.

## Follow-Ups

- `MODES-WORKER-CLIENT-SURFACE-AUDIT1` should audit worker/client grouping safety without moving worker files.
- A later `MODES-WORKER-CLIENT-GROUPING1` may group worker entrypoints and clients only after host ids, fallback evidence, cancellation, and bundler paths are explicitly mapped.
