# STATISTICS-VERTICAL-RESULTS1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Backend Gate

- label: backend
- result: verified pass under standing user approval for all five Statistics visualization commits
- Every successful Statistics route now emits concise labeled answer rows with producer-owned standard MathJSON while preserving the existing primary exact answer for Copy, History, replay, and compatibility.
- A Normal Between fixture exposed and fixed malformed relation spacing in canonical LaTeX without changing the probability calculation.
- Statistics keeps its existing `statistics.evaluate` capability, worker/fallback pair, OOE authority, History identity, replay seed, and canonical renderer.

## UI Gate

- label: ui
- result: verified pass
- Statistics answers render as vertical labeled rows instead of one long horizontal formula.
- `Contained | Full result` is persisted in workspace state. Contained owns one result scrollbar; Full removes the cap and opens every result group on entry while preserving later manual collapse.
- Ordinary answer rows do not create horizontal scrolling. Oversized indivisible math remains the only local horizontal-scroll exception.

## Verification

- Focused Statistics unit coverage passed 36/36; DisplayPanel UI passed 13/13.
- Chromium passed the real-app vertical-row and Full-mode case at 1280 by 800 with no result-panel horizontal overflow.
- Screenshot inspection passed for labeled answer rows, expanded facts, readable controls, and absence of overlap: `.task_tmp/statistics-visualization/gate1-full-result.png`.
- Canonical Result V2 enforcement, display-contract inversion, result-contract, MathJSON coverage, incremental TypeScript, focused lint, file-size ratchet, and diff hygiene passed.

## Protected Worktree

- Notebook and Linear Algebra changes, their staged files, and untracked `test-results/` remain excluded.
- Shared `.memory/current-state.md`, `.memory/decisions.md`, and the daily journal already contain staged Notebook-agent work. This gate records durable evidence in its dedicated session dossier and defers shared-file catch-up until those files are clean rather than co-committing another agent's changes.
- No push is authorized.

## Handoff

- Continue with `STATISTICS-VISUALIZATION-CONTRACT1`.

