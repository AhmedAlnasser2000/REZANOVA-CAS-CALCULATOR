# EQUATION-INEQUALITY-DISTRICT-SPLIT1 Completion Report

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

Split the monolithic Inequality solver facade into private district modules while preserving the public facade exports and current behavior.

## Recovery Note

This memory dossier was added after the implementation commit because the normal memory closeout step was missed when `33b67d5` was created. The recovery was recorded by amending the metadata-only memory commit, not by rewriting the original implementation commit.

## What Changed

- Kept `src/lib/equation/equation-inequality.ts` as the public facade for:
  - `isTopLevelInequalityLatex`
  - `inequalityAnswerModeGuidanceOutcome`
  - `solveBoundedLinearInequality`
- Added private `src/lib/equation/inequality/` modules for relation parsing, finite solving, outcome assembly, periodic formatting, periodic set logic, periodic trig handling, shell peeling, shared types, and wrappers.
- Updated `tools/file-size-baseline.json` after removing the over-cap `equation-inequality.ts` entry.

## Boundaries

- Preserved Exact-only inequality solving.
- Preserved real-line ordered inequalities under Complex intent.
- Preserved `Approximate` / `Isolate` guidance errors, `Valid when` supplements, proof/detail narration, and x-family periodic readback.
- No solver expansion, display-policy change, replay/history/schema change, OOE change, runtime-host change, or worker-host change.

## Verification

- `npx tsc -b --pretty false` passed.
- `npm run test:unit -- src/lib/equation/equation-inequality.test.ts` passed.
- `npm run test:unit -- src/lib/equation/guarded-solve.test.ts src/lib/equation/shared-solve.test.ts` passed.
- `npm run test:file-sizes` passed.
- `git diff --check` passed.

## Size Ratchet

- Removed the over-cap `src/lib/equation/equation-inequality.ts` file-size baseline entry after the split.

## Commits

- `33b67d5` EQUATION-INEQUALITY-DISTRICT-SPLIT1.

## Follow-Ups

- Keep `INEQUALITY-STABILITY1` as a future stability milestone, not part of this structure-only split.
