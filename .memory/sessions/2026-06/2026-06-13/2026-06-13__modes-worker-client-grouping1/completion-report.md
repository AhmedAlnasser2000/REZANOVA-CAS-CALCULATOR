# MODES-WORKER-CLIENT-GROUPING1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Group Modes worker clients and worker entrypoints out of the `src/lib/modes/` root without changing worker behavior or keeping root compatibility stubs.

## What Changed

- Created `src/lib/modes/worker-clients/` and moved all Modes `*-worker-client.ts` files into it.
- Created `src/lib/modes/worker-entrypoints/` and moved all Modes `*.worker.ts` files into it.
- Moved `src/lib/modes/worker-runtime-config.ts` to `src/lib/modes/worker-clients/runtime-config.ts`.
- Updated mode/runtime/test imports to use the grouped worker-client and worker-entrypoint paths.
- Updated every worker client's `new Worker(new URL(..., import.meta.url))` path to load from `../worker-entrypoints/`.
- Added `docs/architecture/modes-worker-client-grouping.md`.
- Updated `docs/architecture/modes-worker-client-surface-audit.md` with the final grouping record.
- Updated `docs/README.md`.

## Boundaries

- Path grouping only.
- No generic worker framework, worker-host identity change, fallback behavior change, cancellation behavior change, OOE traffic-control policy change, diagnostics wording change, replay/history contract change, schema change, capability change, stored-value behavior change, or reserved-symbol policy change.
- Matrix and Vector continue sharing `linear-algebra-worker-runtime` while remaining separate capabilities and workspaces.
- Concurrent Geometry district changes were present in the worktree during this milestone and were intentionally excluded from this commit.

## Verification

- `npx tsc -b --pretty false` passed.
- Focused Geometry precheck passed before resuming worker grouping: `npm run test:unit -- src/lib/geometry/*.test.ts src/lib/geometry/**/*.test.ts`.
- `npm run test:unit -- src/lib/modes/*worker*.test.ts src/lib/modes/table.test.ts` passed.
- `npm run test:unit -- src/lib/ooe/workspace-pilot.test.ts src/lib/ooe/runtime-shell-contract.test.ts src/lib/ooe/ooe-bridge.test.ts` passed.
- `npm run test:ui -- src/app/runtime/useCalculateRuntime.ui.test.tsx src/app/runtime/useCalculusRuntime.ui.test.tsx src/app/runtime/useTableRuntime.ui.test.tsx src/app/runtime/useTrigonometryRuntime.ui.test.tsx src/app/runtime/useStatisticsRuntime.ui.test.tsx src/app/runtime/useGeometryRuntime.ui.test.tsx` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: MODES-WORKER-CLIENT-GROUPING1.

## Follow-Ups

- Keep future worker-host changes descriptor-driven; do not reintroduce duplicated host-id lists.
