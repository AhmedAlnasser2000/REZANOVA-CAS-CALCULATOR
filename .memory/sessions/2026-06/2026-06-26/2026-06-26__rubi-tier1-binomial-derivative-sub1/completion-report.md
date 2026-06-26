# RUBI-TIER1-BINOMIAL-DERIVATIVE-SUB1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend

## Summary

- Added an exact-rational derivative-present binomial substitution fallback for `C*x^(n-1)*(a+b*x^n)^p`.
- Kept visible strategy as `u-substitution` and required exact original-integrand backcheck before adoption.
- Preserved the older numeric substitution route when it already claims a case, including existing broader numeric derivative-present behavior.

## Boundaries

- No symbolic coefficient widening beyond behavior that already existed in the older substitution route.
- No branch-sensitive transformations, broad recurrence machinery, public Rubi metadata, lazy Rubi import, or public Calculus schema changes.
- No Display, History, OOE, Tauri, workspace, persistence, or UI files were touched.
- Untracked Formula Viewer Display-lane files were present and intentionally left untouched.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-26.md`
- `.memory/research/roadmaps/rubi-integration-roadmap.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__rubi-tier1-binomial-derivative-sub1/completion-report.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__rubi-tier1-binomial-derivative-sub1/verification-summary.md`
- `.memory/sessions/2026-06/2026-06-26/2026-06-26__rubi-tier1-binomial-derivative-sub1/commit-log.md`
