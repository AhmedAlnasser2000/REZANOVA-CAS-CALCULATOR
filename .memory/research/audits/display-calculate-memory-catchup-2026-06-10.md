# Display And Calculate Memory Catch-Up - 2026-06-10

## Purpose

This note fixes a durable-memory bookkeeping lapse. The code milestones below had already been committed before their memory entries were written. This catch-up does not change product behavior; it records the already committed work and locks the boundary decisions so later planning does not hallucinate or forget them.

## Missed Commits

- `9423874 Add CALCULATE-RUNTIME-SHELL1 worker shell and tickets`
- `2fc77ef Stabilize worker startup and large-result defer rendering`
- `53a7e91 Add DISPLAY-PROFILING0 render profiling`
- `9770bd8 Add RESULT-SIZE-POLICY1 compact result policy`
- `4e91907 Add DISPLAY-BLOCK-CONTRACT1 renderable blocks`

## Recorded Decisions

- `CALCULATE-RUNTIME-SHELL1` moved Calculate onto the shared OOE runtime-shell and launch-ticket model.
- Calculate uses `calculate-worker-runtime` as the primary worker host and `calculate-runtime` as init/unavailable fallback.
- Existing Calculate capability IDs remain stable: `expression.evaluate`, `expression.simplify`, `expression.factor`, `expression.expand`, `calculate.algebraTransform`, and legacy `calculate.workbench`.
- Calculate remains a broad quickform evaluator. It may call reusable math cores, but it does not become the guided owner for calculus, trigonometry, equation solving, or future step-by-step work.
- The worker/display bridge centralized worker startup and cancellation-polling timeout configuration and added a crude long-LaTeX defer path in the display layer.
- `DISPLAY-PROFILING0` added dev-gated profiling to classify render freezes as LaTeX conversion, DOM/layout, React reconciliation, or mixed display costs.
- `RESULT-SIZE-POLICY1` added compact previews for oversized committed result blocks and explicit user intent through `Show full result`.
- `DISPLAY-BLOCK-CONTRACT1` added an adapter-first renderable block contract over existing `DisplayOutcome` data. It covers answer, approximate output, Valid When, periodic-family data, detail sections, warnings, and error text without adding a required schema field.

## Boundary Rule

OOE owns compute traffic control: launch, host selection, fallback, cancellation, stale gates, commit legality, diagnostics, and launch-order history tickets.

Display owns committed-result rendering policy: compact preview, full-result expansion, collapsible blocks, render profiling, and future display scheduling.

Display policy must never truncate or mutate math semantics. `Copy Result`, `To Editor`, History, replay, stored exact LaTeX, and solver output remain full fidelity even when the immediate UI shows a compact preview.

## Follow-Up Sequence

- `DISPLAY-RENDER-SCHEDULER1` may later stage committed display blocks so the Answer renders first, then Valid When, then detail/fact blocks.
- `DISPLAY-RENDER-COST1` remains optional and should stay crude if needed: conservative length, token count, and nesting-depth heuristics rather than an overfit estimator.
- Shared duplicate Run/Enter hardening remains an OOE follow-up and should not be conflated with display rendering policy.

## Process Correction

Future runtime-shell, launch-ticket, and display-policy milestones should update `.memory/current-state.md`, `.memory/decisions.md`, the daily journal, and any relevant audit/session/checklist files before committing code. If a catch-up is necessary, it should be explicit and memory-only.
