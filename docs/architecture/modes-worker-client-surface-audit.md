# Modes Worker Client Surface Audit

Status: audit + final grouping record

Purpose: document the Modes worker entrypoint and worker-client surface, including the final grouping record for `MODES-WORKER-CLIENT-GROUPING1`.

## Current Surface

- Worker clients live under `src/lib/modes/worker-clients/`: `calculate-worker-client.ts`, `calculus-worker-client.ts`, `equation-worker-client.ts`, `geometry-worker-client.ts`, `linear-algebra-worker-client.ts`, `statistics-worker-client.ts`, `table-worker-client.ts`, and `trigonometry-worker-client.ts`.
- Worker entrypoints live under `src/lib/modes/worker-entrypoints/`: `calculate.worker.ts`, `calculus.worker.ts`, `equation.worker.ts`, `geometry.worker.ts`, `linear-algebra.worker.ts`, `statistics.worker.ts`, `table.worker.ts`, and `trigonometry.worker.ts`.
- Shared worker timing constants live in `worker-clients/runtime-config.ts`.
- No root worker-client or worker-entrypoint compatibility stubs are kept in `src/lib/modes/`.
- Mode/OOE tests cover worker startup, fallback, cancellation, host execution evidence, runtime provenance, and workspace pilot metadata.

## Responsibility Map

- Worker clients own isolated worker construction, request ids, startup acknowledgement, startup timeout fallback, cancellation polling, hard termination, failure fallback, and host execution evidence.
- Worker entrypoints own message contracts and runtime invocation inside the worker bundle.
- OOE pilots and workspace compatibility metadata consume host ids, fallback ids, selected host evidence, trace wording, and diagnostics provenance.
- Modes own request construction and fallback payloads; OOE owns traffic-control metadata; worker files must not become solver ownership.

## Host And Entrypoint Map

- Calculate: `calculate-worker-runtime` -> `calculate-runtime`; entrypoint `worker-entrypoints/calculate.worker.ts`.
- Calculus: `calculus-worker-runtime` -> `calculus-runtime`; entrypoint `worker-entrypoints/calculus.worker.ts`.
- Equation: `equation-worker-runtime` -> `equation-runtime`; entrypoint `worker-entrypoints/equation.worker.ts`.
- Geometry: `geometry-worker-runtime` -> `geometry-runtime`; entrypoint `worker-entrypoints/geometry.worker.ts`.
- Linear Algebra: `linear-algebra-worker-runtime` -> `linear-algebra-runtime`; entrypoint `worker-entrypoints/linear-algebra.worker.ts`.
- Statistics: `statistics-worker-runtime` -> `statistics-runtime`; entrypoint `worker-entrypoints/statistics.worker.ts`.
- Table: `table-worker-runtime` -> `table-runtime`; entrypoint `worker-entrypoints/table.worker.ts`.
- Trigonometry: `trigonometry-worker-runtime` -> `trigonometry-runtime`; entrypoint `worker-entrypoints/trigonometry.worker.ts`.

## Final Grouping Record

Milestone: `MODES-WORKER-CLIENT-GROUPING1`.

- Moved `*-worker-client.ts` files into `src/lib/modes/worker-clients/`.
- Moved `*.worker.ts` files into `src/lib/modes/worker-entrypoints/`.
- Moved `worker-runtime-config.ts` to `src/lib/modes/worker-clients/runtime-config.ts`.
- Updated all direct imports and dynamic Equation worker-client import paths to the grouped locations.
- Updated every worker client's `new Worker(new URL(..., import.meta.url))` bundler path to resolve through `../worker-entrypoints/`.
- Kept host id constants, fallback id constants, request id prefixes, cancellation messages, startup acknowledgement wording, fallback reasons, and host execution evidence shapes unchanged.

## High-Risk Contracts

- Bundler entrypoint paths are runtime-sensitive.
- Host ids are user-visible through diagnostics and OOE provenance.
- Fallback host ids and fallback reasons are asserted by tests and displayed in trace/evidence lines.
- Cancellation behavior depends on polling intervals, hard termination, and cancelled payload wording.
- Matrix and Vector share the Linear Algebra worker host but remain separate capabilities and user-facing workspaces.
- Geometry remains in its current OOE/pilot state; grouping files must not imply a broader Geometry runtime-shell milestone.

## Test Gates For Future Grouping

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/modes/*worker*.test.ts src/lib/modes/table.test.ts`
- `npm run test:unit -- src/lib/ooe/workspace-pilot.test.ts src/lib/ooe/runtime-shell-contract.test.ts src/lib/ooe/ooe-bridge.test.ts`
- `npm run test:ui -- src/app/runtime/useCalculateRuntime.ui.test.tsx src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/runtime/useTableRuntime.ui.test.tsx src/app/runtime/useTrigonometryRuntime.ui.test.tsx src/app/runtime/useStatisticsRuntime.ui.test.tsx src/app/runtime/useGeometryRuntime.ui.test.tsx`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move worker files during this audit.
- Do not introduce a generic worker framework, event bus, Surface Protocol, SDK, or remote-compute layer as part of grouping.
- Do not change solver behavior, worker-host identity, fallback behavior, cancellation behavior, OOE traffic-control policy, diagnostics wording, replay/history contracts, schemas, capabilities, stored-value behavior, or reserved-symbol policy.
