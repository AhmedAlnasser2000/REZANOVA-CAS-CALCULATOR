# Memory Protocol

## Precedence
- `AGENTS.md` has higher priority than any file in `.memory/`.
- If `AGENTS.md` and a memory file conflict, follow `AGENTS.md` and update memory later.

## Read Order
1. `.memory/INDEX.md`
2. `.memory/current-state.md`
3. `.memory/world-canon.md`
4. `.memory/decisions.md`
5. `.memory/open-questions.md`
6. The most recent relevant folder in `.memory/sessions/`
7. The most recent relevant journal entry in `.memory/journal/`
8. `docs/app_summary_latest.md`

## File Boundaries
- `current-state.md`
  - current operating snapshot only
  - active context, risks, pending verification, next task
- `world-canon.md`
  - stable truths that should not drift casually
  - product boundaries, workflow defaults, engineering invariants
- `decisions.md`
  - dated decision log
- `open-questions.md`
  - dated unresolved items
- `journal/`
  - chronological short notes
- `sessions/`
  - task dossiers with fuller completion and verification detail
- `docs/checkpoints/`
  - verified app-state summaries for major milestones

## Write Policy
- Completed code, tooling, UX, architecture, or workflow changes still append concise dated bullets to:
  - `.memory/journal/YYYY-MM-DD.md`
  - `.memory/decisions.md` when a durable decision is locked in
  - `.memory/open-questions.md` when a meaningful unresolved choice remains
- `current-state.md` should be updated when the project operating context materially changes.
- `.memory/sessions/<task-id>/` should be updated at meaningful task or gate completion points.
- Checkpoints under `docs/checkpoints/` should be updated only for major milestones, architecture shifts, or workflow overhauls.

## Tracking Policy
- Durable memory is tracked in git.
- Temporary task tracking lives under `.task_tmp/` and stays ignored.
- Heavy or transient memory subtrees stay ignored.

## Runtime Safety
- Memory files are documentation and workflow infrastructure only.
- Do not make application code depend on `.memory/`, `.task_tmp/`, or checkpoint docs.
