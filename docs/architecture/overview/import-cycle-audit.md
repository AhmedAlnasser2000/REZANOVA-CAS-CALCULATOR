# Import Cycle Audit

Status: audit

Purpose: record a one-off local import-graph inspection over `src/**/*.ts(x)` after the AppMain Equation runtime extraction and repo-wide facade audit. This audit documents cycles only; it does not break them.

## Method

- Ran a local Node.js script over 845 TypeScript/TSX source files.
- Parsed relative static imports, `export ... from` re-exports, and relative dynamic `import(...)` calls.
- Resolved `*.ts`, `*.tsx`, and directory `index.ts(x)` targets.
- Used strongly connected components to identify cycles.
- The scan is intentionally conservative: it counts `import type` edges even when TypeScript erases them at runtime. Each cycle below notes whether the back edge is type-only or value-bearing.
- No dependency or repeatable validator was added.

## Summary

- Cycle components found: 9.
- Must be broken now: 0.
- Should be broken soon: 2.
- Acceptable but monitor: 6.
- Harmless / intentional: 1.

No cycle currently requires stopping this session for a fix. The two "should be broken soon" cycles are small and can be handled by focused boundary cleanup commits.

## Cycle Classification

### Modes Worker Entrypoint Loops

Classification: acceptable but monitor.

Components:

- `src/lib/modes/calculate.ts`
- `src/lib/modes/calculate/runtime.ts`
- `src/lib/modes/worker-clients/calculate-worker-client.ts`
- `src/lib/modes/worker-entrypoints/calculate.worker.ts`

Edges:

- Root Calculate facade exports runtime behavior.
- Calculate runtime calls the worker client.
- Worker client imports worker entrypoint message types and points `new Worker(new URL(...))` at the entrypoint.
- Worker entrypoint imports the root Calculate facade to execute the isolated request.

Risk:

- Mostly intentional worker/client/entrypoint shape.
- The script counts type imports from clients to worker entrypoint message contracts, so the reported cycle is broader than the emitted runtime path.

Recommended break path:

- Future worker cleanup can move worker message contracts into separate message modules under `worker-clients/` or `worker-entrypoints/` so clients do not type-import entrypoints.

Stop rule:

- Do not change worker ids, fallback ids, request id prefixes, startup timeout, cancellation behavior, or host evidence while breaking this.

### Modes Equation Worker Entrypoint Loop

Classification: acceptable but monitor.

Components:

- `src/lib/modes/equation.ts`
- `src/lib/modes/equation/run.ts`
- `src/lib/modes/worker-clients/equation-worker-client.ts`
- `src/lib/modes/worker-entrypoints/equation.worker.ts`

Risk:

- Same shape as Calculate, with extra guarded-trace types.
- Acceptable while worker entrypoints execute through the public root mode facade.

Recommended break path:

- Move Equation worker message types out of the entrypoint in a dedicated worker-message cleanup.

Stop rule:

- Do not change Equation answer modes, guarded trace shape, direct-symbolic fallback, OOE metadata, or worker-host evidence.

### Modes Matrix / Vector Shared Worker Loop

Classification: acceptable but monitor.

Components:

- `src/lib/modes/matrix.ts`
- `src/lib/modes/vector.ts`
- `src/lib/modes/worker-clients/linear-algebra-worker-client.ts`
- `src/lib/modes/worker-entrypoints/linear-algebra.worker.ts`

Risk:

- This is the expected shared Matrix/Vector worker entrypoint shape.
- The entrypoint imports Matrix and Vector mode runners; Matrix and Vector call the shared worker client.
- The client imports entrypoint message types.

Recommended break path:

- Use a message-contract module for `LinearAlgebraWorkerRunPayload`, inbound, and outbound messages if this area is touched again.

Stop rule:

- Preserve Matrix and Vector as separate capabilities/workspaces even though they share `linear-algebra-worker-runtime`.

### Modes Table / OOE Pilot Loop

Classification: resolved by `IMPORT-CYCLE-TABLE-OOE-PILOT1`.

Components:

- `src/lib/modes/table.ts`
- `src/lib/ooe/pilots/table-pilot.ts`

Edges:

- `table.ts` imports the Table OOE pilot value wrapper.
- `table-pilot.ts` type-imports `TableModeResult` from `../../modes/table`.

Risk:

- Type-only back edge, but it crosses Modes and OOE in the wrong direction for a type that is already close to `table-core.ts`.

Recommended break path:

- Change the pilot to import `TableModeResult` from `src/lib/modes/table-core.ts` or a small mode-owned contract module.
- Keep the change focused and preserve pilot metadata, host ids, runtime shell evidence, and diagnostics wording.

Resolution:

- `IMPORT-CYCLE-TABLE-OOE-PILOT1` changed `table-pilot.ts` to type-import `TableModeResult` from `src/lib/modes/table-core.ts`.
- This removed the OOE pilot's type-only back edge to the root Table facade without changing Table runtime behavior, pilot metadata, host ids, runtime shell evidence, or diagnostics wording.

Stop rule:

- Do not fold OOE pilot behavior into Table mode or move Table runtime behavior into OOE.

### OOE Runtime-Control Type Loop

Classification: harmless / intentional.

Components:

- `src/lib/ooe/runtime-control/host-adapter.ts`
- `src/lib/ooe/runtime-control/runtime-envelope.ts`

Edges:

- `host-adapter.ts` type-imports `OoePilotDefinition` from `runtime-envelope.ts`.
- `runtime-envelope.ts` type-imports `OoeHostAdapterStatus` from `host-adapter.ts`.

Risk:

- Type-only contract loop inside one OOE district.
- No emitted runtime import cycle is expected from these two edges.

Recommended break path:

- Optional only: move shared runtime-control contracts into `runtime-control/types.ts` if the district grows.

Stop rule:

- Do not change runtime envelope shape, host adapter evidence, or OOE validation behavior.

### Guarded Equation Run / Substitution Stage Loop

Classification: acceptable but monitor.

Components:

- `src/lib/equation/guarded/run.ts`
- `src/lib/equation/guarded/substitution-stage.ts`

Edges:

- `run.ts` imports substitution stage values for stage registration.
- `substitution-stage.ts` type-imports `GuardedEquationCooperativeCheckpoint` through `run.ts`.

Risk:

- Type-only back edge inside the guarded district.

Recommended break path:

- Import the checkpoint type directly from `guarded/types.ts` or move any remaining public stage types there.

Stop rule:

- Preserve guarded stage order, trace shape, cancellation behavior, recursion trail handling, and direct-symbolic fallback behavior.

### Equation Inequality Periodic Formatting Loop

Classification: resolved by `EQUATION-INEQUALITY-PERIODIC-CYCLE1`.

Components:

- `src/lib/equation/inequality/periodic-format.ts`
- `src/lib/equation/inequality/periodic-set.ts`

Edges:

- `periodic-format.ts` imports `normalizePeriodicNumber` from `periodic-set.ts`.
- `periodic-set.ts` imports formatting helpers from `periodic-format.ts`.

Risk:

- This appears to be a value-bearing helper loop inside the inequality district.
- It is not a current failure, but it is the cleanest candidate for a small future cycle-breaking pass.

Recommended break path:

- Move numeric periodic normalization into a tiny shared helper such as `periodic-math.ts`, or move formatting-only helpers so the dependency direction is one-way.

Resolution:

- `EQUATION-INEQUALITY-PERIODIC-CYCLE1` added `src/lib/equation/inequality/periodic-math.ts` for `normalizePeriodicNumber`.
- `periodic-format.ts` and `periodic-set.ts` now both depend on the tiny math helper instead of depending on each other for numeric normalization.
- `periodic-set.ts` keeps re-exporting `normalizePeriodicNumber` so any private district imports remain stable.

Stop rule:

- Preserve periodic `k\\pi` readback, angle-unit formatting, interval merge semantics, epsilon behavior, and inequality output wording.

### Equation Isolation Algebraic / Power Loop

Classification: acceptable but monitor.

Components:

- `src/lib/equation/isolation/algebraic.ts`
- `src/lib/equation/isolation/algebraic-power.ts`

Edges:

- `algebraic.ts` imports power-solving values from `algebraic-power.ts`.
- `algebraic-power.ts` type-imports stop/success contracts from `algebraic.ts`.

Risk:

- Type-only back edge inside one district.

Recommended break path:

- Move isolation public result/stop contracts into `isolation/types.ts` if the isolation district is touched again.

Stop rule:

- Preserve selected-target and algebraic isolation stop reasons, detail wording, power branch ordering, and Complex Exact readback.

### Parameterized Mixed Algebraic Branch Loop

Classification: acceptable but monitor.

Components:

- `src/lib/equation/parameterized/mixed-algebraic.ts`
- `src/lib/equation/parameterized/mixed-algebraic-branches.ts`

Edges:

- `mixed-algebraic.ts` imports branch solve values.
- `mixed-algebraic-branches.ts` type-imports carrier/result contracts from `mixed-algebraic.ts`.

Risk:

- Type-only back edge inside one parameterized district.

Recommended break path:

- Move carrier/result contracts into a private `mixed-algebraic-types.ts` module if the district grows.

Stop rule:

- Preserve generated-equation handoff behavior, branch limits, fact wording, exact Latex, and unsupported-family stop behavior.

## Candidate Areas Requested In The Note

- Modes Matrix/Vector/worker paths: found one acceptable-but-monitor worker entrypoint loop.
- OOE runtime-control relationships: found one harmless type-only runtime-control loop.
- Modes/Table/OOE pilot paths: found one type-only cross-boundary loop that should be broken soon.
- Equation inequality districts: found one value-bearing periodic formatting loop that should be broken soon.
- Equation parameterized districts: found one type-only mixed-algebraic branch loop.
- Equation guarded districts: found one type-only run/substitution-stage loop.
- Equation isolation districts: found one type-only algebraic/power loop.

## High-Risk Contracts

- Do not break cycles by deleting root facades or bypassing public imports outside an explicitly scoped migration.
- Do not move message contracts in a way that changes worker bundler entrypoints, host ids, fallback ids, request id prefixes, startup/cancellation behavior, or host evidence.
- Do not change OOE runtime envelope shape, runtime shell evidence, stale-gate behavior, diagnostics wording, schemas, or capabilities.
- Do not change Equation solver order, output wording, exact Latex, display/readback policy, replay/history contract, answer modes, domain intent, or reserved-symbol policy.

## Recommended Follow-Ups

1. `IMPORT-CYCLE-TABLE-OOE-PILOT1`: break the Table pilot type-only loop by importing result contracts from `table-core.ts` or a small mode contract module.
2. `EQUATION-INEQUALITY-PERIODIC-CYCLE1`: break the periodic-format/periodic-set value loop with a tiny shared periodic math helper.
3. Later worker-message contract cleanup if Modes worker entrypoint cycles become noisy in tooling.

## Stop Rules

- If future cycle scans find a runtime value cycle crossing OOE traffic control and mode request construction, pause and plan a fix before further OOE movement.
- If a cycle-breaking patch requires output text, schema, capability, worker-host, replay/history, or solver behavior changes, stop and split it into an explicit behavior milestone.
