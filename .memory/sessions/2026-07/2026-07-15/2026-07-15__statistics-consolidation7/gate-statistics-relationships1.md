# STATISTICS-RELATIONSHIPS1

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
- result: verified pass under standing user approval for all seven Statistics commits
- Regression and Correlation now read one canonical paired-data state while retaining their distinct request kinds, result routes, worker/fallback ownership, OOE capability, replay seeds, and History behavior.
- Legacy regression/correlation requests and workspace snapshots hydrate the shared point set without dropping incomplete drafts.
- The existing result producers remain unchanged and preserve fitted line, slope, intercept, Pearson r, r-squared, SSE, MSE, residual standard error, strength interpretation, and small-sample/fit cautions.

## UI Gate

- label: ui
- result: verified pass under standing user approval for all seven Statistics commits
- One Relationships surface now owns a stable paired x/y table and a Regression/Correlation segmented selector. Switching analysis changes only the generated request kind and never replaces the rows.
- Chromium verified one-keystroke focus retention, incomplete-row preservation, both real evaluations, expanded residual diagnostics, desktop composition, 390px mobile stacking, and local overflow containment.
- Visual evidence: `.task_tmp/statistics-consolidation7/gate4-relationships-desktop.png`, `gate4-relationships-mobile.png`, and `gate4-relationships-result.png`.

## Verification

- Focused Statistics core tests passed 9/9 and Statistics runtime UI passed 12/12.
- Focused Chromium passed the shared-data evaluation path and responsive layout path after correcting the test to await the new result answer before opening progressively rendered details.
- Incremental TypeScript and production build passed with 3,602 modules transformed. Focused lint, the 1,914-file size ratchet, and diff hygiene passed.

## Protected Worktree

- Concurrent Matrix definiteness and Notebook media-header work, shared contract baselines, and untracked `test-results/` remain untouched.
- No push is authorized.

## Handoff

- Continue with `STATISTICS-INFERENCE1`.
- Keep plots and diagrams excluded through Gate 7.
