# STATISTICS-VISUALIZATION-CONTRACT1

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
- Added a versioned, discriminated `StatisticsVisualizationPayloadV1` with bounded weighted-data, distribution, paired-point, residual, confidence-interval, and test-distribution views.
- Worker/fallback payloads and the existing per-section result cache can carry only clone-safe Calcwiz data; no ECharts option or runtime object crosses the boundary.
- Selected visualization per section and histogram bin count persist in Statistics workspace state. Zoom and the Expression keypad swap remain transient.
- Existing capability, Statistics worker/fallback hosts, OOE lifecycle, History, replay, canonical result renderer, and section-cache semantics remain unchanged.

## UI Gate

- label: ui
- result: verified pass
- Statistics alone replaces the lower keypad with an always-present visualization dock; every other workspace retains `KeypadPanel` unchanged.
- Guided always owns the dock. Expression defaults to the dock and exposes a keyboard icon that temporarily swaps in the existing keypad.
- Empty, stale, completed-placeholder, and keypad states share stable dock dimensions. A new result revision, section change, or input-mode change resets the transient keypad view.
- ECharts 6.1 is installed with a Statistics-owned modular `echarts/core` and `SVGRenderer` initialization boundary. No React chart wrapper was added.

## Verification

- Visualization-contract tests passed 2/2, Statistics result tests passed 9/9, lower-panel UI passed 3/3, and Statistics runtime UI passed 15/15.
- Chromium passed the Statistics-only dock replacement, non-Statistics keypad preservation, and Expression keypad swap at 1280 by 800.
- Screenshot inspection passed: `.task_tmp/statistics-visualization/gate2-dock.png` and `gate2-expression-keypad.png`.
- Incremental TypeScript passed for the Gate 2 tree before later concurrent Linear Algebra edits appeared. The latest rerun is externally blocked only by unfinished `linearAlgebraMatrixActionRequest.ts` and `symbolic-matrix.ts` typing; focused lint, production Vite build, the file-size ratchet, and diff hygiene passed.
- `npm install` reported the repository's existing nine-item audit inventory; no broad dependency repair was run.

## Protected Worktree

- Notebook and Linear Algebra changes, their staged files, and untracked `test-results/` remain excluded.
- Shared current-state, decisions, and daily-journal files remain owned by the staged Notebook lane; durable gate evidence stays in this dedicated session dossier until those shared files are clean.
- No push is authorized.

## Handoff

- Continue with `STATISTICS-DATA-PROBABILITY-VISUALS1` and populate the approved payload for Data and Summary plus Probability results.
