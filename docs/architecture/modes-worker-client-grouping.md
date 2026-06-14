# Modes Worker Client Grouping

Status: shipped in `MODES-WORKER-CLIENT-GROUPING1`

Purpose: record the tree-declutter grouping for Modes worker clients and worker entrypoints without changing worker-host identity, fallback behavior, cancellation behavior, OOE policy, or mode ownership.

## Final Shape

- Worker clients live in `src/lib/modes/worker-clients/`.
- Worker entrypoints live in `src/lib/modes/worker-entrypoints/`.
- Shared worker timing constants live in `src/lib/modes/worker-clients/runtime-config.ts`.
- `src/lib/modes/` root no longer contains `*-worker-client.ts`, `*.worker.ts`, or `worker-runtime-config.ts`.
- No root compatibility stubs were kept; callers import the grouped paths directly.

## Moved Clients

- `calculate-worker-client.ts`
- `calculus-worker-client.ts`
- `equation-worker-client.ts`
- `geometry-worker-client.ts`
- `linear-algebra-worker-client.ts`
- `statistics-worker-client.ts`
- `table-worker-client.ts`
- `trigonometry-worker-client.ts`

## Moved Entrypoints

- `calculate.worker.ts`
- `calculus.worker.ts`
- `equation.worker.ts`
- `geometry.worker.ts`
- `linear-algebra.worker.ts`
- `statistics.worker.ts`
- `table.worker.ts`
- `trigonometry.worker.ts`

## Preserved Contracts

- Host ids and fallback ids remain unchanged.
- Request id prefixes remain unchanged.
- Worker message contracts remain unchanged.
- Startup acknowledgement, timeout fallback, hard cancellation, and fallback reason behavior remain unchanged.
- Matrix and Vector continue sharing `linear-algebra-worker-runtime` while remaining separate capabilities and workspaces.
- Geometry worker grouping does not imply a broader Geometry runtime-shell milestone.

## Import Boundary

- Mode orchestration files import worker clients from `./worker-clients/...`.
- Tests that exercise worker message contracts import entrypoint types from `./worker-entrypoints/...`.
- Worker clients import their entrypoint message types from `../worker-entrypoints/...`.
- Worker clients create workers with `new URL('../worker-entrypoints/<name>.worker.ts', import.meta.url)`.

## Verification Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/modes/*worker*.test.ts src/lib/modes/table.test.ts`
- `npm run test:unit -- src/lib/ooe/pilots/workspace-pilot.test.ts src/lib/ooe/runtime-control/runtime-shell-contract.test.ts src/lib/ooe/bridge-schema/ooe-bridge.test.ts`
- `npm run test:ui -- src/app/runtime/useCalculateRuntime.ui.test.tsx src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/runtime/useTableRuntime.ui.test.tsx src/app/runtime/useTrigonometryRuntime.ui.test.tsx src/app/runtime/useStatisticsRuntime.ui.test.tsx src/app/runtime/useGeometryRuntime.ui.test.tsx`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`
