# INTEGRATION-RATIONAL-PF-BACKCHECK-CACHE1 Completion Report

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

- Added scoped per-backcheck rational normalization/equivalence memoization inside `backcheckAntiderivative()`.
- Added verifier-local raw exact-rational equivalence for proof checks, avoiding public rational-function normalization, GCD, domain-fact, and LaTeX/readback construction when a cross-multiplied exact-polynomial comparison is enough.
- Reordered exact radical-scalar cleanup before expensive equivalence fallbacks so nonsquare repeated-quadratic arctan derivatives normalize cheaply.
- Fixed AST-only differentiation to use `normalizeAst()` instead of `normalizeNode(...).ast`, avoiding accidental derivative LaTeX/precedence rendering.
- Made `derivativeLatex` lazy in antiderivative backcheck and omitted it for exact proofs, where current consumers only need the exact verification status.

## Scope Kept Out

- No new integration rules.
- No public Rubi metadata.
- No public Calculus strategy/result schema changes.
- No Display, History, OOE, Tauri, persistence, workspace, or UI changes.
- No persistent/global equivalence cache.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-06/2026-06-27.md`
- `.memory/research/roadmaps/rubi-integration-roadmap.md`
- `.memory/sessions/2026-06/2026-06-27/2026-06-27__integration-rational-pf-backcheck-cache1/`
