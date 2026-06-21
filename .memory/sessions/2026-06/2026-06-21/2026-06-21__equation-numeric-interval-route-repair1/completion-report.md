# EQUATION-NUMERIC-INTERVAL-ROUTE-REPAIR1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- Route repair only for Equation Numeric Interval Solve.
- No Approx answer-mode restoration.
- No Display, History, OOE, app-state, Tauri schema, or numeric engine behavior changes.

## Completed

- Routed Equation primary Run through numeric interval solving when the Numeric Interval panel is explicitly open.
- Preserved symbolic Exact/Isolate primary Run behavior when the panel is hidden.
- Kept advisory eligibility separate from panel visibility so exact stops can expose the `Numeric Solve` opener without auto-arming numeric execution.
- Removed the panel-local `Run Numeric Solve` button and made the panel configuration-only for Start, End, and Subdivisions.
- Updated guide copy and UI/runtime tests for the new workflow.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-06/2026-06-21.md`
- `.memory/research/roadmaps/equation-substrate-roadmap.md`
- `.memory/sessions/2026-06/2026-06-21/2026-06-21__equation-numeric-interval-route-repair1/`
