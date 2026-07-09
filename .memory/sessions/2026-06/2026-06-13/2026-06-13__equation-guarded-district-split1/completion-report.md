# EQUATION-GUARDED-DISTRICT-SPLIT1 Completion Report

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

Split the guarded Equation district into private modules while preserving public facades and guarded solver behavior.

## What Changed

- Kept `src/lib/equation/guarded-solve.ts` as the root public facade.
- Kept `src/lib/equation/guarded/run.ts` as the guarded runtime facade exporting the same public functions and types.
- Added private guarded modules for shared guarded types, request preparation, cancellation checkpoints, direct-symbolic fallback/host handoff, bounded polynomial solving, and stage orchestration.
- Kept `src/lib/equation/guarded/algebra-stage.ts` as the algebra-transform stage facade exporting `algebraTransformSolve`.
- Added private `src/lib/equation/guarded/algebra/` modules for algebra types, MathJSON helpers, radical and rational-power transforms, absolute-value transforms, repeated-clearing transforms, and rational/conjugate transforms.
- Updated `tools/file-size-baseline.json` after removing stale over-cap guarded entries.

## Boundaries

- No guarded stage-order changes.
- No solver behavior, output wording, display/readback, OOE, replay/history, schema, capability, worker-host, or reserved-symbol changes.
- No `EQUATION-GUARDED-STABILITY1` behavior hardening.
- `src/lib/equation/guarded/substitution-stage.ts` stayed intact aside from existing facade type compatibility.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts` passed.
- `npm run test:unit -- src/lib/equation/shared-solve.test.ts src/lib/equation/solver-parity.contract.test.ts src/lib/modes/equation.test.ts` passed.
- `npm run test:unit -- src/lib/equation/equation-direct-symbolic-worker.test.ts src/app/logic/runtimeControllers.test.ts` passed.
- `npm run lint` passed.
- `npm run build` passed with existing Vite dynamic/static import chunking warnings.
- `npm run test:file-sizes` passed.
- `npm run test:memory-protocol` passed.
- `git diff --check` passed.

## Size Ratchet

- Removed stale baseline entries for:
  - `src/lib/equation/guarded/algebra-stage.ts`
  - `src/lib/equation/guarded/run.ts`
- All new guarded district modules stayed below the 900-line ratchet.

## Commits

- Same-commit milestone: EQUATION-GUARDED-DISTRICT-SPLIT1.

## Follow-Ups

- Keep guarded stability hardening as a later explicit milestone.
