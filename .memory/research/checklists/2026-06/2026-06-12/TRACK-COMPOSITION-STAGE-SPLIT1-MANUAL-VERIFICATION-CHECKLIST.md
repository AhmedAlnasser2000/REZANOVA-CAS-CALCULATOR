# TRACK-COMPOSITION-STAGE-SPLIT1 Manual Verification Checklist

Milestone: `COMPOSITION-STAGE-SPLIT1`
Date: 2026-06-12
Agent: codex
Model: gpt-5

## Scope

- [x] Keep `composition/stage.ts` as the guarded composition runtime owner.
- [x] Extract stable carrier helpers to `composition/carriers.ts`.
- [x] Extract stable periodic-family helpers to `composition/periodic-family.ts`.
- [x] Re-export moved public carrier helpers through `composition/stage.ts` and the root compatibility wrapper.
- [x] Update polynomial carrier follow-on imports to use `composition/carriers`.
- [x] Lower the moved stage file-size baseline after extraction.

## Verification

- [x] TypeScript static check passed.
- [x] Focused composition, guarded solve, shared solve, polynomial follow-on, and Equation mode unit tests passed.
- [x] Lint passed.
- [x] Build passed.
- [x] File-size ratchet passed.
- [x] Memory protocol passed.

## Deferred

- [ ] Splitting the main `compositionSolve` flow.
- [ ] Splitting recursive guarded handoff or candidate validation.
- [ ] Solver behavior or output changes.
- [ ] OOE, schema, capability, history/replay, or display contract changes.
