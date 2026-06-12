# TRACK-EQUATION-COMPOSITION-DISTRICT1 Manual Verification Checklist

Milestone: `EQUATION-COMPOSITION-DISTRICT1`
Date: 2026-06-12
Agent: codex
Model: gpt-5

## Scope

- [x] Move composition-owned Equation files into `src/lib/equation/composition/`.
- [x] Keep root compatibility re-export wrappers for `composition-stage.ts` and `composition-core.ts`.
- [x] Update first-party imports to prefer composition district paths.
- [x] Preserve composition runtime/source labels, badges, error text, detail titles, branch metadata sources, and exact output behavior.
- [x] Migrate the moved stage file-size ratchet entry.

## Verification

- [x] Focused composition, guarded solve, shared solve, polynomial follow-on, and Equation mode unit tests passed.
- [x] Lint passed.
- [x] File-size ratchet passed.

## Deferred

- [ ] `COMPOSITION-STAGE-SPLIT1` helper extraction.
- [ ] Solver behavior or output changes.
- [ ] OOE, schema, history/replay, or display contract changes.
