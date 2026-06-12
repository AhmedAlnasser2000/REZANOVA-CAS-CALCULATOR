# TRACK-EQUATION-DISTRICT-SPLIT1 Manual Verification Checklist

Milestone: `EQUATION-DISTRICT-SPLIT1`
Date: 2026-06-12
Agent: codex
Model: gpt-5.5

## Scope

- [x] Move the selected-target `equation-parameterized-*` family into `src/lib/equation/parameterized/`.
- [x] Use short district filenames for implementation and paired tests.
- [x] Keep `equation-selected-target-isolation.ts` in the Equation root as dispatcher/seam.
- [x] Preserve exported function/type names, solver behavior, display behavior, OOE behavior, and history/replay schema.
- [x] Preserve emitted runtime/source labels such as `equation-parameterized-trig`.
- [x] Migrate file-size ratchet entries for moved over-cap files manually.

## Verification

- [x] Focused parameterized Equation tests passed.
- [x] Selected-target isolation test passed.
- [x] Algebraic isolation test passed.
- [x] Equation mode test passed.
- [x] File-size ratchet passed.
- [x] Memory protocol passed.
- [x] Lint passed.
- [x] Build passed.

## Deferred

- [ ] Split `composition-stage.ts`.
- [ ] Broader Equation district moves for complex, inequality, numeric, guarded, polynomial, readback, runtime, history, and shared ownership.
- [ ] `APPMAIN-SLIM6` orchestration extraction.
