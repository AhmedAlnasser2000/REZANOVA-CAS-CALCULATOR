# STATISTICS-RELATIONSHIPS-INFERENCE-VISUALS1

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
- Regression and Correlation share one parsed paired-data calculation. Regression emits scatter-plus-fit and residual payloads; Correlation emits scatter-only evidence and cannot carry a fitted line.
- Confidence-interval and hypothesis-test visuals use the same Statistics-owned mean, spread, standard-error, Student-t, critical-value, and p-value calculations as the canonical result.
- All three test alternatives are represented. Zero-variance infinite statistics remain explicit bounded markers instead of invalid numeric payload values.
- The global `Approximate digits` setting is carried in the existing Statistics evaluation request and OOE revision. Worker results, answer-row LaTeX/MathJSON approximations, plot axes, histogram boundaries, and hover values use the committed setting; raw plot payload values remain calculation-owned.

## UI Gate

- label: ui
- result: verified pass
- Regression defaults to scatter plus fitted line and offers Residuals. Correlation renders scatter without implying a regression result.
- Mean confidence intervals render estimate and endpoints on one number line. Mean tests render the Student-t density, statistic, critical boundary or boundaries, and the appropriate p-value tail or tails.
- Visualization labels, selectors, and numeric controls use one spaced field layout. Selects and white inputs have readable dark text, stable widths, and measured label clearance at the 1280 by 800 support floor.
- Successful evaluations remain fresh. Later input or precision edits mark the cached result and plot stale until Evaluate succeeds.

## Verification

- Focused Statistics backend passed 91/91, including relationship/inference payloads, contracts, chart-number formatting, worker runtime, histogram precision, and vertical answer rows.
- Statistics runtime and lower-panel UI passed 18/18.
- Incremental TypeScript, touched-file lint, and production Vite build passed. The production build transformed 4,347 modules.
- Chromium passed the four Data/Probability/Relationships/Inference visualization cases, followed by focused fresh-result reruns after the precision revision fix. Screenshots were visually inspected at 1280 by 800 for fit, residual, correlation, confidence interval, test distribution, histogram controls, and numeric readability.
- Browser assertions prove at least 10 px between visible labels and their select/input controls, no false post-evaluation Stale badge, and a two-digit Regression result of `-0.33` rather than six-decimal output.
- Canonical Result V2 frozen-producer enforcement passed. The aggregate MathJSON ratchet remains externally blocked by the committed Linear Algebra expectation mismatch: 491/491 proven leaves are observed while its test still expects 466/466. Statistics adds no leaf-count mismatch or exemption.
- The repository file-size ratchet passed after precision-aware request construction moved into a focused Statistics runtime helper; `AppMain.tsx` and `useStatisticsRuntime.ts` remain at their committed caps.

## Protected Worktree

- Active Linear Algebra source, tests, shared result-count baselines, and untracked `test-results/` remain excluded from the Statistics commit.
- Shared current-state, decisions, and daily-journal updates are already present, but a concurrent Linear Algebra checkpoint currently owns their staged index state. This dedicated gate record is committed with Statistics rather than absorbing or unstaging the other checkpoint.
- No push is authorized.

## Handoff

- Commit this gate as `STATISTICS-RELATIONSHIPS-INFERENCE-VISUALS1`, then implement `STATISTICS-VISUALIZATION-POLISH1`.
