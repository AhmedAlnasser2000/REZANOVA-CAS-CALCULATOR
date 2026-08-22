# Memory Protocol

## Precedence
- `AGENTS.md` has higher priority than any file in `.memory/`.
- If `AGENTS.md` and a memory file conflict, follow `AGENTS.md` and update memory later.

## Read Order
1. `AGENTS.md`
2. `.memory/PROTOCOL.md`
3. `.memory/INDEX.md`
4. `.memory/current-state.md`
5. `.memory/world-canon.md`
6. `.memory/decisions.md`
7. `.memory/open-questions.md`
8. `.memory/closed-questions.md`
9. The most recent relevant folder in `.memory/sessions/YYYY-MM/YYYY-MM-DD/`
10. The most recent relevant journal entry in `.memory/journal/YYYY-MM/`
11. `docs/app_summary_latest.md`

## Agent Attribution Schema
- Use simple lowercase agent slugs for agent fields:
  - `codex`
  - `claude`
  - `gemini`
  - `kimi`
- Use fuller runtime identifiers for model fields when known:
  - examples: `gpt-5.3-codex`, `gpt-5.4`, `gpt-5.5`, `gpt-5.6`, `claude-sonnet-4`, `gemini-2.5-pro`
- Use lowercase family identifiers for agent family fields:
  - `sol`
  - `terra`
  - `luna`
  - `k3`
- Allowed `attribution_basis` values:
  - `live`
  - `historical-user-confirmed`
  - `handoff`
  - `mixed`
- Core attribution fields:
  - `primary_agent`
  - `primary_agent_model`
  - `primary_agent_family`
  - `contributors`
  - `recorded_by_agent`
  - `recorded_by_agent_model`
  - `recorded_by_agent_family`
  - `verified_by_agent`
  - `verified_by_agent_model`
  - `verified_by_agent_family`
  - `committed_by_agent`
  - `committed_by_agent_model`
  - `committed_by_agent_family`
  - `attribution_basis`
- Family fields are required prospectively for artifacts dated `2026-07-09` or later. Historical artifacts before that date keep their recorded shape; do not invent family values for them.
- Compact journal and decision prefixes use `agent_family` beside `agent`/`model`, plus `primary_agent_family` beside the primary-owner fields.

## Artifact Requirements
- `.memory/current-state.md`
  - include an `Agent Ownership` section near the top
  - include current historical-backfill rules when they exist
  - the most recent completed milestone should identify its owner
- `.memory/journal/YYYY-MM/YYYY-MM-DD.md`
  - historical files may use a file-level `## Historical Attribution` block
  - new entries should start with a compact prefix such as `[agent: codex | model: gpt-5.4]`
  - for entries dated `2026-07-09` or later, the family-bearing prefix `[agent: codex | model: gpt-5.6 | agent_family: sol | primary_agent: codex | primary_agent_model: gpt-5.6 | primary_agent_family: sol | attribution_basis: live]` supersedes the short pre-family example
- `.memory/sessions/YYYY-MM/YYYY-MM-DD/<task-id>/completion-report.md`
  - include an `## Attribution` block at the top
  - require all non-commit attribution fields
- `.memory/sessions/YYYY-MM/YYYY-MM-DD/<task-id>/verification-summary.md`
  - include an `## Attribution` block at the top
  - require all non-commit attribution fields
  - add `commit_hash` when verification is tied to a recorded commit
- `.memory/sessions/YYYY-MM/YYYY-MM-DD/<task-id>/commit-log.md`
  - include an `## Attribution` block at the top
  - require `committed_by_agent` and `committed_by_agent_model` only when a commit is actually recorded
  - when a commit is planned, update commit metadata in the same checkpoint whenever possible instead of making a follow-up metadata-only commit
- `.memory/approvals.md`
  - is reserved for governance-level approvals, workflow-policy approvals, and major roadmap-sequencing approvals
  - do not use it for every routine feature task

## Historical Ownership Rule
- The current historical backfill rule is canonical unless the user explicitly revises it.
- All current historical work through the existing repo history belongs to:
  - `primary_agent: codex`
- Model split:
  - before `2026-03-12`: `primary_agent_model: gpt-5.3-codex`
  - on or after `2026-03-12`: `primary_agent_model: gpt-5.4`
- This model split preserves explicit historical values; it is not an instruction to reinterpret the generic placeholders covered by the separate correction below.
- User-confirmed correction:
  - exact attribution model value `gpt-5` means `gpt-5.5`
  - exact attribution model value `gpt-5-codex` means `gpt-5.5`
  - the correction must not rewrite `gpt-5.4`, `gpt-5.3-codex`, or any lower/versioned historical value
- Historical family values are not backfilled. Family recording begins prospectively on `2026-07-09`.
- Historical backfill must use:
  - `attribution_basis: historical-user-confirmed`

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
- `closed-questions.md`
  - dated resolved or superseded items moved out of open questions
- `journal/`
  - chronological short notes grouped by month as `journal/YYYY-MM/YYYY-MM-DD.md`
- `sessions/`
  - task dossiers grouped as `sessions/YYYY-MM/YYYY-MM-DD/YYYY-MM-DD__short-slug/`
- `docs/checkpoints/`
  - verified app-state summaries for major milestones

## Write Policy
- Completed code, tooling, UX, architecture, or workflow changes still append concise dated bullets to:
  - `.memory/journal/YYYY-MM/YYYY-MM-DD.md`
  - `.memory/decisions.md` when a durable decision is locked in
  - `.memory/open-questions.md` when a meaningful unresolved choice remains
  - `.memory/closed-questions.md` when a stale open question is resolved or superseded
- `current-state.md` should be updated when the project operating context materially changes.
- Daily catch-up is mandatory: `.memory/current-state.md` must have a `Last updated` date at least as new as the newest durable journal/session day. The memory-protocol validator fails when a newer journal or session exists, so agents must refresh current-state before committing the first meaningful work of a new day.
- `.memory/sessions/YYYY-MM/YYYY-MM-DD/<task-id>/` should be updated at meaningful task or gate completion points.
- Every journal month that records completed milestone work should have at least one corresponding session dossier month under `.memory/sessions/YYYY-MM/`; related slices may be grouped into one dossier when that keeps memory navigable.
- Every meaningful task or verified gate must carry attribution metadata in the updated durable-memory artifacts.
- Every cross-agent handoff must be recorded in the active session dossier before the next agent continues the task.
- When a task is committed, prefer recording `commit_hash` and commit-log details as part of that same commit flow; do not split those updates into a second commit unless a recovery situation forces it.
- Checkpoints under `docs/checkpoints/` should be updated only for major milestones, architecture shifts, or workflow overhauls.
- Before starting a new roadmap track, add a user-facing manual verification checklist for the just-finished track.
  - Store it under `.memory/research/checklists/YYYY-MM/YYYY-MM-DD/` or the active session folder.
  - Checklist must include: `what is achieved now`, `manual app steps`, and `expected results`.

## Tracking Policy
- Durable memory is tracked in git.
- Temporary task tracking lives under `.task_tmp/` and stays ignored.
- Heavy or transient memory subtrees stay ignored.

## Runtime Safety
- Memory files are documentation and workflow infrastructure only.
- Do not make application code depend on `.memory/`, `.task_tmp/`, or checkpoint docs.
