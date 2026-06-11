# TRACK-DISPLAY-PRODUCER-METADATA2 Manual Verification Checklist

Date: 2026-06-11
Status: completed
Owner: codex

## Scope

- Add producer-owned branch metadata where the repo already has real finite branch arrays.
- First target: Equation selected-target trig routes with existing `solutionExpressions`.
- Preserve full `exactLatex` for Copy Result, To Editor, history, replay, and stored output.

## Checks

- [x] Direct affine trig selected-target branches emit `branchReadback`.
- [x] Same-argument mixed sine/cosine selected-target branches emit `branchReadback`.
- [x] Single-branch tangent selected-target output remains a normal single answer.
- [x] Equation mode forwards selected-target trig `branchReadback` into `DisplayOutcome`.
- [x] `DISPLAY-OUTPUT-STRUCTURE-AUDIT1` marks Equation selected-target trig as fixed.
- [x] Tuple systems, inequalities, geometry facts, statistics facts, table rows, matrix/vector grids, and triangle measurements remain out of branch metadata scope.

## Verification

- [x] `npm run test:unit -- src/lib/display/*.test.ts src/lib/equation/equation-parameterized-trig.test.ts src/lib/modes/equation.test.ts`
