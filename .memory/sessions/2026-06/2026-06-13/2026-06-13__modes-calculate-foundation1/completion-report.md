# MODES-CALCULATE-FOUNDATION1 Completion Report

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

Split Calculate mode orchestration behind the stable root `src/lib/modes/calculate.ts` facade while preserving quickform behavior and public imports.

## What Changed

- Converted root `src/lib/modes/calculate.ts` into a compatibility facade.
- Added private Calculate mode modules for request contracts, OOE snapshots, result titles, stored-value policy, standard quickform execution, explicit Algebra transforms, and runtime/OOE wrapper wiring.
- Split the broad root `calculate.test.ts` suite into focused compatibility tests under `src/lib/modes/calculate/`.
- Kept `calculate-navigation.ts`, `calculate-worker-client.ts`, and `calculate.worker.ts` in place.
- Added `docs/architecture/modes-calculate-foundation.md`.
- Updated `docs/architecture/modes-surface-roadmap-audit.md` and `docs/README.md`.

## Boundaries

- Structure-only split.
- No solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contract, schema, capability, worker-host behavior, stored-value behavior, answer-mode behavior, domain-intent behavior, or reserved-symbol changes.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/modes/calculate/*.test.ts src/lib/modes/calculate-navigation.test.ts src/lib/modes/calculate-worker-runtime.test.ts` passed.
- `npm run test:ui -- src/app/runtime/useCalculateRuntime.ui.test.tsx` passed.
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts` passed through the combined runtime-controller check.
- `npm run test:unit -- src/lib/ooe/expression-pilot.test.ts src/lib/ooe/workspace-pilot.test.ts` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: MODES-CALCULATE-FOUNDATION1.

## Follow-Ups

- Run `MODES-WORKER-CLIENT-SURFACE-AUDIT1` next without moving worker/client files.
