# EQUATION-DISTRICT-SPLIT1 Verification Summary

Date: 2026-06-12
Agent: codex
Model: gpt-5.5

## Result

`EQUATION-DISTRICT-SPLIT1` was implemented as a move-only structure slice.

## What Changed

- Moved the 10 selected-target parameterized Equation implementation files and their 10 paired tests into `src/lib/equation/parameterized/`.
- Renamed moved files to short district filenames such as `linear.ts`, `trig.ts`, `exp-log.ts`, and `readback.ts`.
- Updated imports in Equation selected-target isolation, Equation mode, algebraic isolation, and moved district files.
- Kept `equation-selected-target-isolation.ts` at the Equation root as the dispatcher/seam.
- Preserved runtime source labels like `equation-parameterized-trig`.
- Migrated file-size ratchet entries for moved over-cap files.

## Boundaries

- No solver logic changes.
- No display policy changes.
- No OOE behavior changes.
- No history or replay schema changes.
- No worker, host, capability, or source-label changes.

## Verification

- `npm run test:file-sizes` passed.
- `npm run test:unit -- src/lib/equation/parameterized/*.test.ts src/lib/equation/equation-selected-target-isolation.test.ts src/lib/equation/equation-algebraic-isolation.test.ts src/lib/modes/equation.test.ts` passed.
- `npm run test:memory-protocol` passed.
- `npm run lint` passed.
- `npm run build` passed.
