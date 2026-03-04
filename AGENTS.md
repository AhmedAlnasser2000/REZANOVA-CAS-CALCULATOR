# Calcwiz Agent Policy

## Memory Policy
- After finishing any task that changes code, architecture, tooling, UX behavior, or project workflow, append a concise dated note to `.memory/journal/YYYY-MM-DD.md` before sending the final response.
- If the task locks in a durable product or engineering decision, also append a dated bullet to `.memory/decisions.md`.
- If the task leaves an unresolved design or roadmap choice, append a dated bullet to `.memory/open-questions.md`.
- Durable memory under `.memory/` is expected to be tracked in git; temporary task tracking belongs in `.task_tmp/` and must stay ignored.
- Update `.memory/current-state.md` and the active `.memory/sessions/<task-id>/...` dossier whenever a meaningful task or verified gate completes.
- Keep memory updates short, factual, and human-readable. Prefer bullets.
- Do not make runtime behavior depend on `.memory/`.
- If `.memory/` is missing, recreate the existing structure before writing notes.

## Workflow Policy
- Default workflow is commit-first, not worktree-first.
- Commit after each meaningful verified gate instead of after every tiny edit.
- Keep explicit user approval before `git commit` and `git push`.
- Use `.task_tmp/<task-id>/` for multi-step or UI-heavy tasks that need gate notes, verification logs, or recovery artifacts.
- Label gates as `ui` or `backend` and record verification evidence before considering them complete.
- Worktrees or extra branches are exceptions for parallel isolation, risky rewrites, or recovery scenarios; they are not the default model for this repo.
- Do not make runtime behavior depend on workflow artifacts in `.task_tmp/`, `docs/checkpoints/`, or `.memory/`.

## Scope
- This policy is project-local and should be followed automatically in future sessions for this repository.
