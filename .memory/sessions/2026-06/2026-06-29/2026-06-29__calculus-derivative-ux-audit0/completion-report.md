# CALCULUS-DERIVATIVE-UX-AUDIT0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Summary

Completed `CALCULUS-DERIVATIVE-UX-AUDIT0` as a docs/memory-only audit.

## Findings

- Derivative and derivative-at-point still use lower `secondary-mathfield` body editors in the guided Calculus workspace.
- Integrals and Laplace already use the main editor as the expression body/source path.
- The apparent duplicate derivative answer is a presentation/source ownership problem, not a second solver result.
- Guided Calculus derivative evaluation still delegates through the Calculate derivative path, so route/cost preflight should follow after UX source cleanup.

## Artifacts

- `docs/architecture/calculus/calculus-derivative-ux-audit.md`
- `docs/architecture/calculus/calculus-differentiation-roadmap.md`

## Boundaries

- No runtime behavior, UI behavior, solver behavior, Display scheduling, OOE, History, Tauri, persistence, schemas, worker hosts, capability ids, or public result contracts changed.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/journal/2026-06/2026-06-29.md`
- `.memory/open-questions.md`
- `.memory/sessions/2026-06/2026-06-29/2026-06-29__calculus-derivative-ux-audit0/completion-report.md`
- `.memory/sessions/2026-06/2026-06-29/2026-06-29__calculus-derivative-ux-audit0/verification-summary.md`
- `.memory/sessions/2026-06/2026-06-29/2026-06-29__calculus-derivative-ux-audit0/commit-log.md`
