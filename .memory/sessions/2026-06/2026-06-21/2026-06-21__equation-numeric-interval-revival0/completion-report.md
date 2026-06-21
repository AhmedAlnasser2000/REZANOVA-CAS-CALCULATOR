# EQUATION-NUMERIC-INTERVAL-REVIVAL0 Completion Report

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

- Audit/docs/memory only.
- No production source changes.
- No solver behavior, UI, OOE, Display, History, app-state, Tauri, or schema changes.

## Findings

- Answer-mode semantics are closed enough to move on: active modes are `Exact` and `Isolate`; Numeric Interval Solve is a contextual numeric route/tool.
- Header Run/F1 still routes through symbolic `runEquationAction()` even when the Numeric Interval panel is visible; the panel's inner button uses `runEquationNumericSolveAction()`.
- Numeric Interval currently uses uniform bracket-first sampling plus local-minimum recovery and candidate validation.
- Probe evidence shows ordinary roots are stable, while nested periodic/discontinuous cases are sensitive to endpoint shifts and subdivision count.
- Guidance and suggested-interval handoff are stale relative to the new route/tool framing.

## Recommended Next Milestones

1. `EQUATION-NUMERIC-INTERVAL-ROUTE-REPAIR1`
2. `EQUATION-NUMERIC-INTERVAL-GUIDANCE1`
3. `EQUATION-NUMERIC-INTERVAL-STABILITY1`

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-06/2026-06-21.md`
- `.memory/research/audits/equation-numeric-interval-revival0-2026-06-21.md`
- `.memory/sessions/2026-06/2026-06-21/2026-06-21__equation-numeric-interval-revival0/`
