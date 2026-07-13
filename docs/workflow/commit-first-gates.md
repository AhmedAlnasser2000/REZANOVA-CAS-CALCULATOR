# Commit-First Workflow And Gates

## Default Model
- Work on the current active branch for the current feature area.
- Commit after each meaningful verified gate.
- Keep explicit approval before `git commit` and before `git push`.
- Use `.task_tmp/<task-id>/` when work spans multiple gates, needs manual UI verification, or is likely to take more than one commit.
- `AGENTS.md` is the authoritative policy file for this workflow. This doc is the detailed operating contract, not a competing rulebook.

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
- Every gate summary must state whether it is `backend` or `ui`.
- Every completed task or gate summary must list which durable memory files were updated.
- If one agent hands work to another, record the handoff in the active session dossier before the next agent continues implementation.

## Resource-Safe Gate Selection
- Ordinary edits use affected tests and the contract ratchets selected by the changed seams.
- Milestone commits add incremental TypeScript, memory protocol, file-size, and diff-hygiene checks. They do not require an automatic full-suite rerun.
- Complete unit, UI, canary, or aggregate `test:gate` runs belong to program closeout, release preparation, or genuinely cross-cutting changes.
- Vitest full runs are capped at four workers and must run alone. Announce the run before starting it and stop any orphaned test or preview process afterward.
- Preserve a successful broad result across a later bounded correction by recording the prior broad evidence plus targeted post-correction evidence. Rerun broadly only when the correction changes shared contracts, worker topology, global test infrastructure, or similarly broad behavior.
- When a terminal or reporter disappears, inspect the process and available result before deciding whether another run is justified. Do not rerun reflexively.

## Agent Attribution
- Durable memory must follow `.memory/PROTOCOL.md`.
- Session dossiers, journal entries, and current-state updates must record:
  - milestone ownership via `primary_agent`
  - the agent/model that recorded the memory
  - the agent/model that verified the gate
- Commit metadata belongs in session `commit-log.md` and other commit-recording artifacts only when a commit actually exists.
- When a commit is being made, update session commit metadata in that same checkpoint whenever possible; avoid a second metadata-only commit unless recovery is unavoidable.
- `CLAUDE.md` and `GEMINI.md` are compatibility stubs only; `AGENTS.md` remains authoritative.

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
