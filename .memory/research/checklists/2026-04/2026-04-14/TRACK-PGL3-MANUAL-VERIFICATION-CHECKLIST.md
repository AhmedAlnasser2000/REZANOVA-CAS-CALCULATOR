# TRACK-PGL3 Manual Verification Checklist

## What Is Achieved Now

- Playground has a real symbolic-search lab:
  - replayable guarded-stage ordering
  - fixed 12-case corpus
  - dedicated `npm run test:playground` harness
- The first experiment result is recorded in the authoritative Playground record and manifest.
- The symbolic-search pilot remains active at `level-0-research` because alternate whole-stage orderings introduced an honesty regression and no exact improvements.

## Manual Repo Steps

1. Open `playground/records/sym-search-planner-ordering.md`.
2. Confirm the record is `status: active` and still `current_level: level-0-research`.
3. Confirm the `Result Summary` and `Promotion Decision` sections are filled in with real evidence.
4. Open `playground/manifests/sym-search-planner-ordering.yaml`.
5. Confirm the manifest matches the record `experiment_id`, status, and level.
6. Open `playground/level-0-research/symbolic-search/`.
7. Confirm the lane contains:
   - corpus definition
   - planner orderings
   - classification logic
   - the lab test
8. Run `npm run test:playground`.

## Expected Results

- The symbolic-search experiment is no longer a placeholder record.
- The lab reruns cleanly from the repo.
- The result stays recorded as a real Level 0 research outcome, not a promoted feasibility milestone.
