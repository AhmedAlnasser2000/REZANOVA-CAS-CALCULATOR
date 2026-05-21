# TRACK-PGL2 Manual Verification Checklist

## What Is Achieved Now

- Playground has a canonical record system:
  - authoritative Markdown experiment records
  - companion YAML manifests
  - shared promotion and retirement checklist templates
  - a human-readable records index
- The seeded symbolic-search experiment exists as a real tracked record and manifest pair.

## Manual Repo Steps

1. Open `playground/templates/experiment-record-template.md`.
2. Confirm the canonical metadata fields are present:
   - `experiment_id`
   - `title`
   - `owner`
   - `lane_topic`
   - `current_level`
   - `status`
   - `date_started`
   - `last_reviewed`
   - `next_review`
   - `candidate_stable_home`
   - `companion_manifest`
3. Open `playground/templates/experiment-manifest-template.yaml`.
4. Confirm it is a lightweight companion summary and not a workflow engine schema.
5. Open `playground/records/INDEX.md`.
6. Confirm `sym-search-planner-ordering` appears in the index.
7. Open both:
   - `playground/records/sym-search-planner-ordering.md`
   - `playground/manifests/sym-search-planner-ordering.yaml`
8. Confirm they use the same `experiment_id` and both point at the symbolic-search lane.

## Expected Results

- Markdown is clearly the source of truth.
- YAML is clearly a companion summary.
- The records index is the single human-readable list of active experiments.
- The symbolic-search starter experiment is fully real and ready for `PGL3` lab work.
