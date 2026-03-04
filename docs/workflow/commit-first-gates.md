# Commit-First Workflow And Gates

## Default Model
- Work on the current active branch for the current feature area.
- Commit after each meaningful verified gate.
- Keep explicit approval before `git commit` and before `git push`.
- Use `.task_tmp/<task-id>/` when work spans multiple gates, needs manual UI verification, or is likely to take more than one commit.

## Gate Types
- `backend`
  - command-driven verification
  - tests, build, lint, schema, tooling behavior
- `ui`
  - manual verification steps
  - expected visual or interaction result
  - explicit note about what still needs user confirmation

## Gate Rules
- Default to one open gate at a time.
- Record evidence before closing a gate.
- Close a gate with:
  - `pass`
  - `fail`
  - `blocked`
- Commit only after a meaningful gate closes successfully.

## Temporary Task Tracking
- Use `.task_tmp/<task-id>/` for:
  - `state.json`
  - `notes.md`
  - `gates/*.md`
- `.task_tmp/` stays ignored and should not become a durable source of truth.
- Durable outcomes must be promoted into:
  - `.memory/journal/`
  - `.memory/current-state.md`
  - `.memory/sessions/`
  - `docs/checkpoints/` when the change is milestone-scale

## Worktrees And Extra Branches
- Not the default.
- Use them only when isolation is genuinely needed:
  - parallel unrelated work
  - risky rewrites
  - branch comparison
  - recovery scenarios

## Wrong-Branch Recovery
- Stop editing immediately.
- Create an exact patch artifact under `.task_tmp/<task-id>/wrong_branch_recovery.patch`.
- Reapply from the patch, not from memory.
- Verify parity before continuing.

## Checkpoints
- Update `docs/app_summary_latest.md` and checkpoint history only for major milestones, architecture shifts, large harmonization passes, or workflow overhauls.
