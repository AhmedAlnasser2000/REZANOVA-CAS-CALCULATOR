# MODES-EQUATION-DISTRICT-SPLIT1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Task Goal

Split Equation mode production orchestration behind the stable root `src/lib/modes/equation.ts` facade.

## What Changed

- Converted root `src/lib/modes/equation.ts` into a compatibility facade.
- Added private modules for public contracts, OOE snapshots, runtime outcomes, stored values, guided polynomial/system screens, selected-target parameterized routing, symbolic orchestration, transform adaptation, and public runner wiring.
- Kept `equation-ui-model.ts`, `equation-worker-client.ts`, and `equation.worker.ts` in place.
- Updated the Modes Equation audit with the production split record.
- Removed the stale root production file-size baseline entry.

## Boundaries

- Structure-only production split.
- No solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contract, schema, capability, worker-host behavior, stored-value behavior, answer-mode behavior, domain-intent behavior, or reserved-symbol changes.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/modes/equation/*.test.ts src/lib/modes/equation-complex-stability.test.ts src/lib/modes/equation-worker-runtime.test.ts` passed.
- `npm run test:unit -- src/app/logic/runtimeControllers.test.ts src/lib/ooe/equation-pilot.test.ts` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `node tools/validate-file-sizes.mjs --update-baseline` removed the stale root production baseline entry.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Commits

- Same-commit milestone: MODES-EQUATION-DISTRICT-SPLIT1.

## Follow-Ups

- Consider `MODES-CALCULATE-SURFACE-AUDIT0` if staying in Modes.
- Consider `OOE-PILOT-SURFACE-AUDIT1` if moving into OOE cleanup.
