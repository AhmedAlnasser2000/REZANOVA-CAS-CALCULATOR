# Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
  - user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- commit_hash: this milestone commit

## Gate
- Kind: `backend` exact linear-map gate with required `ui` visual evidence.
- Scope: parser/dispatch, Matrix core reuse, request/replay schema, readback cards, keypad Shift template, controlled caps, and app-visible classifications.

## Verification Evidence
- The broader Linear Algebra/Matrix/History/display regression passed 24 files and 202 tests.
- Focused runtime UI passed 4 files and 5 tests, including profile OOE/History snapshot evidence and preserved Vector replay/canonicalization behavior.
- Chromium passed 3/3 foundation/profile scenarios. Full-page inspection covered singular square and tall rectangular maps, expanded learner facts, collapsed RREF evidence, Shift template, readable formulas, and no overflow or `APPROX` card.
- Singular square evidence showed rank 1, nullity 1, kernel span of `[-1,1]`, image span of `[1,2]`, not one-to-one, not onto, determinant 0, and not invertible.
- Rectangular evidence showed a map from `R^2` to `R^3`, rank 2, nullity 0, one-to-one, not onto, and explicit not-applicable invertibility wording.
- `npx tsc -b --pretty false`, `npm run build`, full `npm run lint`, `npm run test:file-sizes`, `npm run test:compartments-boundaries`, and `npm run test:ooe-boundaries` passed.
- `npm run test:memory-protocol` and `git diff --check` pass before commit.

## Outcome
- Passed. Matrix linear-map profiles are exact, replayable, learner-readable, and reuse existing Matrix elimination ownership.
