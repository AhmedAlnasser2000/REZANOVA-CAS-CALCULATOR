# WORKSPACE-RUNTIME-REQUEST-FACADES1 Completion Report

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

Add narrow public runtime-request facades for Trigonometry, Statistics, and Geometry before enforcing stricter app-runtime import boundaries.

## What Changed

- Added `src/lib/trigonometry/runtime-request.ts`.
- Added `src/lib/statistics/runtime-request.ts`.
- Added `src/lib/geometry/runtime-request.ts`.
- Updated `useTrigonometryRuntime`, `useStatisticsRuntime`, and `useGeometryRuntime` to import request-building APIs from those facades.
- Added focused facade compatibility tests for current parse/serialize/source-sync/screen mapping/revision behavior.
- Updated Supercarrier workspace-request and compartment docs.

## Boundaries

- Did not change parser behavior, serializer behavior, runtime request shapes, OOE policy, worker-host identities, Guide/replay seeds, history/replay behavior, Display policy, bus behavior, Surface Protocol boundaries, or solver behavior.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: WORKSPACE-RUNTIME-REQUEST-FACADES1.

## Follow-Ups

- `COMPARTMENTS-WORKSPACE-RUNTIME-VALIDATOR1` can now ban app-runtime direct imports from workspace parser/runtime-input/serializer/shared internals.
